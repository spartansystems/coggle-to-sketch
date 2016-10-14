var onRun = function (context) {
  var apiKey = getAuthField('Coggle API Key')
  if (apiKey.length() === 0) { return null }
  var organisationId = getAuthField('Coggle Organisation ID')
  if (organisationId.length() === 0) { return null }
  var cogglePath = 'https://coggle.it/api/1/diagrams/'
  var diagram_url = cogglePath + '?access_token=' + apiKey + '&organisation=' + organisationId
  var diagramNSUrl = [NSURL URLWithString:diagram_url]

  var diagrams = getCoggleData(diagramNSUrl)
  var options = diagrams.map(function (diagram) {return diagram.title})

  var choice = createSelect('Choose a Coggle', options)

  var nodes_url = cogglePath + diagrams[choice]['_id'] + '/nodes?access_token=' + apiKey + '&organisation=' + organisationId

  var nodeNSUrl = [NSURL URLWithString:nodes_url]

  var nodes = getCoggleData(nodeNSUrl)

  importSymbols(context, getSymbolsFromNodes(nodes))

  function getAuthField (message) {
    var alert = COSAlertWindow.new()

    alert.setMessageText(message)
    alert.addTextFieldWithValue('')

    alert.addButtonWithTitle('OK')
    alert.addButtonWithTitle('Cancel')

    alert.runModal()

    return alert.viewAtIndex(0).stringValue()
  }

  function getCoggleData (url) {
    // define the request
    var theRequest = NSMutableURLRequest.requestWithURL_cachePolicy_timeoutInterval(url, NSURLRequestReloadIgnoringLocalCacheData, 60)
    theRequest.setHTTPMethod_('GET')

    // get response data
    var theResponseData = [NSURLConnection sendSynchronousRequest:theRequest returningResponse:nil error:nil]

    if (theResponseData!=nil) {
      // convert data to json
      theText = [[NSString alloc] initWithData:theResponseData encoding:NSUTF8StringEncoding]
      return jsonData = JSON.parse(theText)
    }

    return []
  }

  function createSelect (msg, items) {
    // Setup Select Box options
    selectedItemIndex = 0
    var accessory = NSComboBox.alloc().initWithFrame(NSMakeRect(0,0,200,25))
    accessory.addItemsWithObjectValues(items)
    accessory.selectItemAtIndex(selectedItemIndex)

    // Create Alert with Select Box
    var alert = NSAlert.alloc().init()
    alert.setMessageText(msg)
    alert.addButtonWithTitle('OK')
    alert.addButtonWithTitle('Cancel')
    alert.setAccessoryView(accessory)

    // Run Box and accept response
    var responseCode = alert.runModal()
    var selectedIndex = accessory.indexOfSelectedItem()

    return selectedIndex
  }

  function getSymbolsFromNodes (nodes) {
    return nodes.reduce(function (acc, node) {
      return acc.concat(getSymbol(node))
    }, [])
  }

  function getSymbol (node, symbols = []) {
    var symbol = node.text.match(/:(.*?):/)
    if (symbol) {
      symbols.push([NSString stringWithFormat:"%@", symbol[1]])
    }
    return symbols.concat(getSymbolsFromNodes(node.children))
  }

  function importSymbols (context, symbols) {
    var doc = context.document

    // Ask user to select a Sketch file:
    var openDialog = NSOpenPanel.openPanel()
    openDialog.setCanChooseFiles(true)
    openDialog.setAllowedFileTypes(['sketch'])
    openDialog.setCanChooseDirectories(false)
    openDialog.setAllowsMultipleSelection(false)
    openDialog.setCanCreateDirectories(false)
    openDialog.setTitle('Select a Sketch document to copy Symbols from')

    if( openDialog.runModal() == NSOKButton ) {
      var docURL = openDialog.URL()
      var sourceDoc = MSDocument.new()

      if(sourceDoc.readFromURL_ofType_error(docURL, 'com.bohemiancoding.sketch.drawing', nil)) {
        //Define default Symbol Page
        var sp = doc.documentData().symbolsPageOrCreateIfNecessary()
        doc.setCurrentPage(sp)

        // Get source document symbols
        var sourceSymbols = sourceDoc.documentData().allSymbols()
        var sourceSymbolArray = []

        // Hack because the symbol "array" doesn't support fancy JS methods
        for (var i = 0; i < sourceSymbols.count(); i++) {
          sourceSymbolArray.push(sourceSymbols[i])
        }

        // Filter out wanted symbols
        sourceSymbolArray.filter(function (symbol) { return symbols.includes(symbol.name()) }).map(function (importable) {
          doc.addLayer(importable)
        })
      }

      //Refresh Sketch, close source doc
      doc.pageTreeLayoutDidChange()
      sourceDoc.close()
      sourceDoc = nil
    }
  }
}
