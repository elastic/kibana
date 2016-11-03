
import {
  defaultFindTimeout,
} from '../';

export default class MonitoringPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getWelcome() {
    return this.findTimeout
    .findDisplayedByCssSelector('render-directive')
    .getVisibleText();
  }

  dismissWelcome() {
    return this.remote.setFindTimeout(3000)
    .findDisplayedByCssSelector('button.btn-banner')
    .click();
  }

  getToasterContents() {
    return this.findTimeout
    .findByCssSelector('div.toaster-container.ng-isolate-scope')
    .getVisibleText();
  }

  clickOptOut() {
    return this.findTimeout.findByLinkText('Opt out here').click();
  }

}
