import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class MonitoringPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getWelcome() {
    return this.findTimeout
    .findDisplayedByCssSelector('.euiCallOut--primary')
    .getVisibleText();
  }

  async optOutPhoneHome() {
    const button = await this.findTimeout
    .findDisplayedByCssSelector('#globalBannerList div.euiFlexItem:nth-child(2)');
    PageObjects.common.debug(`button text = ${await button.getVisibleText()}`);
    await button.click();
    await PageObjects.common.sleep(3006);
  }

  async dismissWelcome() {
    await this.optOutPhoneHome();
  }

  async enableMonitoring() {
    await PageObjects.common
    .findTestSubject('enableCollectionEnabled')
    .click();
  }
  // need better test selectors for Monitoring
  // https://github.com/elastic/x-plugins/issues/2758

  getElasticsearchSmallPanelStatus() {
    return this.findTimeout
    .findDisplayedByCssSelector('span[title^="Cluster"]')
    .getAttribute('title');
  }

  getKibanaSmallPanelStatus() {
    return this.findTimeout
    .findDisplayedByCssSelector('span[title^="Instances"]')
    .getAttribute('title');
  }

  getElasticsearchSmallPanelUptime() {
    return this.findTimeout
    .findDisplayedByCssSelector('div.statusContainer > span.status')
    .getVisibleText();
  }

  getElasticsearchSmallPanelNodeCount() {
    return PageObjects.common
    .findTestSubject('number_of_elasticsearch_nodes')
    .getVisibleText();
  }

  getAccessDeniedMessage() {
    return this.findTimeout
    // .findDisplayedByCssSelector('div.application.tab-access-denied > div > div > div.kuiInfoPanelHeader > span.kuiInfoPanelHeader__title')
    .findDisplayedByCssSelector('div.application.tab-access-denied span.kuiInfoPanelHeader__title')
    .getVisibleText();
  }

}
