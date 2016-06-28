
import {
  defaultFindTimeout,
} from '../';

export default class ConsolePage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getServer() {
    return this.findTimeout
    .findByCssSelector('#kibana-body > div.content > div > div')
    .getVisibleText();
  }

  setServer(server) {
    return this.findTimeout
    .findByCssSelector('input[aria-label="Server Name"]')
    .clearValue()
    .type(server);
  }

  getRequest() {
    return this.findTimeout
    .findAllByCssSelector('div.ace_line_group')
    .then(function (editorData) {

      function getEditorData(line) {
        return line.getVisibleText();
      }

      var getEditorDataPromises = editorData.map(getEditorData);
      return Promise.all(getEditorDataPromises);
    });
  }

  getResponse() {
    return this.findTimeout
    .findByCssSelector('#output > div.ace_scroller > div')
    .getVisibleText();
  }

  clickPlay() {
    return this.findTimeout
    .findByCssSelector('#editor_actions > span.ng-scope > a > i')
    .click();
  }

  collapseHelp() {
    return this.findTimeout
    .findByCssSelector('div.config-close.remove > i')
    .click();

  }

}
