import { remote, defaultFindTimeout } from '../';

// in test/support/pages/shield_page.js
export default (function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  var thisTime;

  function ConsolePage() {
  }

  ConsolePage.prototype = {
    constructor: ConsolePage,

    init(remote) {
      this.remote = remote;
      thisTime = this.remote.setFindTimeout(defaultFindTimeout);
    },

    getServer: function getServer() {
      return thisTime
      .findByCssSelector('#kibana-body > div.content > div > div')
      .getVisibleText();
    },

    setServer: function setServer(server) {
      return thisTime
      .findByCssSelector('input[aria-label="Server Name"]')
      .clearValue()
      .type(server);
    },

    getRequest: function getRequest() {
      return thisTime
      .findAllByCssSelector('div.ace_line_group')
      .then(function (editorData) {

        function getEditorData(line) {
          return line.getVisibleText();
        }

        var getEditorDataPromises = editorData.map(getEditorData);
        return Promise.all(getEditorDataPromises);
      });
    },

    getResponse: function getResponse() {
      return thisTime
      .findByCssSelector('#output > div.ace_scroller > div')
      .getVisibleText();
    },

    clickPlay: function clickPlay() {
      return thisTime
      .findByCssSelector('#editor_actions > span.ng-scope > a > i')
      .click();
    },

    collapseHelp: function collapseHelp() {
      return thisTime
      .findByCssSelector('div.config-close.remove > i')
      .click();

    }


  };

  return ConsolePage;
}());
