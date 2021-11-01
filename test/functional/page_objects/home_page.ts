/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class HomePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly log = this.ctx.getService('log');

  async clickSynopsis(title: string) {
    await this.testSubjects.click(`homeSynopsisLink${title}`);
  }

  async doesSynopsisExist(title: string) {
    return await this.testSubjects.exists(`homeSynopsisLink${title}`);
  }

  async doesSampleDataSetExist(id: string) {
    return await this.testSubjects.exists(`sampleDataSetCard${id}`);
  }

  async isSampleDataSetInstalled(id: string) {
    const sampleDataCard = await this.testSubjects.find(`sampleDataSetCard${id}`);
    const sampleDataCardInnerHTML = await sampleDataCard.getAttribute('innerHTML');
    this.log.debug(sampleDataCardInnerHTML);
    return sampleDataCardInnerHTML.includes('removeSampleDataSet');
  }

  async isWelcomeInterstitialDisplayed() {
    return await this.testSubjects.isDisplayed('homeWelcomeInterstitial');
  }

  async getVisibileSolutions() {
    const solutionPanels = await this.testSubjects.findAll('~homSolutionPanel', 2000);
    const panelAttributes = await Promise.all(
      solutionPanels.map((panel) => panel.getAttribute('data-test-subj'))
    );
    return panelAttributes.map((attributeValue) => attributeValue.split('homSolutionPanel_')[1]);
  }

  async addSampleDataSet(id: string) {
    const isInstalled = await this.isSampleDataSetInstalled(id);
    if (!isInstalled) {
      await this.retry.waitFor('wait until sample data is installed', async () => {
        await this.testSubjects.click(`addSampleDataSet${id}`);
        await this._waitForSampleDataLoadingAction(id);
        return await this.isSampleDataSetInstalled(id);
      });
    }
  }

  async removeSampleDataSet(id: string) {
    // looks like overkill but we're hitting flaky cases where we click but it doesn't remove
    await this.testSubjects.waitForEnabled(`removeSampleDataSet${id}`);
    // https://github.com/elastic/kibana/issues/65949
    // Even after waiting for the "Remove" button to be enabled we still have failures
    // where it appears the click just didn't work.
    await this.common.sleep(1010);
    await this.testSubjects.click(`removeSampleDataSet${id}`);
    await this._waitForSampleDataLoadingAction(id);
  }

  // loading action is either uninstall and install
  async _waitForSampleDataLoadingAction(id: string) {
    const sampleDataCard = await this.testSubjects.find(`sampleDataSetCard${id}`);
    await this.retry.try(async () => {
      // waitForDeletedByCssSelector needs to be inside retry because it will timeout at least once
      // before action is complete
      await sampleDataCard.waitForDeletedByCssSelector('.euiLoadingSpinner');
    });
  }

  async launchSampleDashboard(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Dashboard');
  }

  async launchSampleDataSet(id: string) {
    await this.addSampleDataSet(id);
    await this.common.closeToastIfExists();
    await this.testSubjects.click(`launchSampleDataSet${id}`);
  }

  async clickAllKibanaPlugins() {
    await this.testSubjects.click('allPlugins');
  }

  async clickVisualizeExplorePlugins() {
    await this.testSubjects.click('tab-data');
  }

  async clickAdminPlugin() {
    await this.testSubjects.click('tab-admin');
  }

  async clickOnConsole() {
    await this.clickSynopsis('console');
  }
  async clickOnLogo() {
    await this.testSubjects.click('logo');
  }

  async clickOnAddData() {
    await this.clickSynopsis('home_tutorial_directory');
  }

  // clicks on Active MQ logs
  async clickOnLogsTutorial() {
    await this.clickSynopsis('activemqlogs');
  }

  // clicks on cloud tutorial link
  async clickOnCloudTutorial() {
    await this.testSubjects.click('onCloudTutorial');
  }

  // click on global nav toggle button
  async clickToggleGlobalNav() {
    await this.testSubjects.click('toggleNavButton');
  }

  async clickGoHome() {
    await this.openCollapsibleNav();
    await this.testSubjects.click('homeLink');
  }

  // open global nav if it's closed
  async openCollapsibleNav() {
    if (!(await this.testSubjects.exists('collapsibleNav'))) {
      await this.clickToggleGlobalNav();
    }
  }

  // collapse the observability side nav details
  async collapseObservabibilitySideNav() {
    await this.testSubjects.click('collapsibleNavGroup-observability');
  }

  async loadSavedObjects() {
    await this.retry.try(async () => {
      await this.testSubjects.click('loadSavedObjects');
      const successMsgExists = await this.testSubjects.exists('loadSavedObjects_success', {
        timeout: 5000,
      });
      if (!successMsgExists) {
        throw new Error('Failed to load saved objects');
      }
    });
  }
}
