
import {
  defaultFindTimeout,
} from '../';

export default class SecurityPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getWelcome() {
    return this.findTimeout
    .findDisplayedByCssSelector('.banner')
    .getVisibleText();
  }

  // need better test selectors for Monitoring
  // https://github.com/elastic/x-plugins/issues/2758

  getElasticsearchSmallPanelStatus() {
    return this.findTimeout
    //#kibana-body > div > div > div > div.application.ng-scope.tab-overview > div >
    //  monitoring-main > div > div > monitoring-cluster-overview > div > div:nth-child(1) >
    // div > div > div.statusContainer > span.status.status-yellow > span:nth-child(1)

    // #kibana-body > div > div > div > div.application.ng-scope.tab-overview > div >
    //  monitoring-main > div > div > monitoring-cluster-overview > div > div:nth-child(2) >
    // div > div > div > span.status.status-green > span:nth-child(1)
    .findDisplayedByCssSelector('div.statusContainer > span.status')
    .getVisibleText();
  }

  getKibanaSmallPanelStatus() {
    return this.findTimeout
    .findDisplayedByCssSelector('div:nth-child(2) > div > div > div > span.status')
    .getVisibleText();
  }

  getElasticsearchSmallPanelUptime() {
    return this.findTimeout
    .findDisplayedByCssSelector('div.statusContainer > span.status')
    .getVisibleText();
  }


}
