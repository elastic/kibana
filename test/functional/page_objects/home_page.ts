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
  public readonly log = this.ctx.getService('log');
  private readonly toasts = this.ctx.getService('toasts');

  async clickSynopsis(title: string) {
    await this.testSubjects.click(`homeSynopsisLink${title}`);
  }

  async doesSynopsisExist(title: string) {
    return await this.testSubjects.exists(`homeSynopsisLink${title}`);
  }

  async doesSampleDataSetExist(id: string) {
    return await this.testSubjects.exists(`sampleDataSetCard${id}`);
  }

  async openSampleDataAccordion() {
    const accordionButton = await this.testSubjects.find('showSampleDataButton');
    let expandedAttribute = await accordionButton.getAttribute('aria-expanded');
    let expanded = expandedAttribute.toLocaleLowerCase().includes('true');
    this.log.debug(`Sample data accordion expanded: ${expanded}`);

    if (!expanded) {
      await this.retry.waitFor('sample data according to be expanded', async () => {
        this.log.debug(`Opening sample data accordion`);
        await accordionButton.click();
        expandedAttribute = await accordionButton.getAttribute('aria-expanded');
        expanded = expandedAttribute.toLocaleLowerCase().includes('true');
        return expanded;
      });
      this.log.debug(`Sample data accordion expanded: ${expanded}`);
    }
  }

  async isSampleDataSetInstalled(id: string) {
    const sampleDataCard = await this.testSubjects.find(`sampleDataSetCard${id}`);
    const installStatus = await (
      await sampleDataCard.findByCssSelector('[data-status]')
    ).getAttribute('data-status');
    const deleteButton = await sampleDataCard.findAllByTestSubject(`removeSampleDataSet${id}`);
    this.log.debug(`Sample data installed: ${deleteButton.length > 0}`);
    return installStatus === 'installed' && deleteButton.length > 0;
  }

  async isWelcomeInterstitialDisplayed() {
    // give the interstitial enough time to fade in
    await new Promise((resolve) => setTimeout(resolve, 500));
    return await this.testSubjects.isDisplayed('homeWelcomeInterstitial', 2000);
  }

  async isGuidedOnboardingLandingDisplayed() {
    return await this.testSubjects.isDisplayed('guided-onboarding--landing-page');
  }

  async isHomePageDisplayed() {
    return await this.testSubjects.isDisplayed('homeApp');
  }

  async getVisibileSolutions() {
    const solutionPanels = await this.testSubjects.findAll('~homSolutionPanel', 2000);
    const panelAttributes = await Promise.all(
      solutionPanels.map((panel) => panel.getAttribute('data-test-subj'))
    );
    return panelAttributes.map((attributeValue) => attributeValue.split('homSolutionPanel_')[1]);
  }

  async goToSampleDataPage() {
    await this.testSubjects.click('addSampleData');
    await this.doesSampleDataSetExist('ecommerce');
  }

  async addSampleDataSet(id: string) {
    await this.openSampleDataAccordion();
    const isInstalled = await this.isSampleDataSetInstalled(id);
    if (!isInstalled) {
      this.log.debug(`Attempting to add sample data: ${id}`);
      await this.retry.waitFor('sample data to be installed', async () => {
        // Echoing the adjustments made to 'removeSampleDataSet', as we are seeing flaky test cases here as well
        // https://github.com/elastic/kibana/issues/52714
        await this.testSubjects.waitForEnabled(`addSampleDataSet${id}`);
        await this.common.sleep(1010);
        await this.testSubjects.click(`addSampleDataSet${id}`);
        await this.common.sleep(1010);
        await this._waitForSampleDataLoadingAction(id);
        return await this.isSampleDataSetInstalled(id);
      });
    }
  }

  async removeSampleDataSet(id: string) {
    await this.openSampleDataAccordion();
    const isInstalled = await this.isSampleDataSetInstalled(id);
    if (isInstalled) {
      this.log.debug(`Attempting to remove sample data: ${id}`);
      await this.retry.waitFor('sample data to be removed', async () => {
        // looks like overkill but we're hitting flaky cases where we click but it doesn't remove
        await this.testSubjects.waitForEnabled(`removeSampleDataSet${id}`);
        // https://github.com/elastic/kibana/issues/65949
        // Even after waiting for the "Remove" button to be enabled we still have failures
        // where it appears the click just didn't work.
        await this.common.sleep(1010);
        await this.testSubjects.click(`removeSampleDataSet${id}`);
        await this.common.sleep(1010);
        await this._waitForSampleDataLoadingAction(id);
        return !(await this.isSampleDataSetInstalled(id));
      });
    }
  }

  // loading action is either uninstall and install
  async _waitForSampleDataLoadingAction(id: string) {
    const sampleDataCard = await this.testSubjects.find(`sampleDataSetCard${id}`);
    await this.retry.try(async () => {
      // waitForDeletedByCssSelector needs to be inside retry because it will timeout at least once
      // before action is complete
      this.log.debug(`Waiting for loading spinner to be deleted for sampleDataSetCard${id}`);
      await sampleDataCard.waitForDeletedByCssSelector('.euiLoadingSpinner');
    });
  }

  async launchSampleDiscover(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Discover');
  }

  async launchSampleDashboard(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Dashboard');
  }

  async launchSampleCanvas(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Canvas');
  }

  async launchSampleMap(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Map');
  }

  async launchSampleLogs(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Logs');
  }

  async launchSampleGraph(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('Graph');
  }

  async launchSampleML(id: string) {
    await this.launchSampleDataSet(id);
    await this.find.clickByLinkText('ML jobs');
  }

  async launchSampleDataSet(id: string) {
    await this.addSampleDataSet(id);
    await this.toasts.dismissIfExists();
    await this.retry.try(async () => {
      await this.testSubjects.click(`launchSampleDataSet${id}`);
      await this.find.byCssSelector(
        `.euiPopover-isOpen[data-test-subj="launchSampleDataSet${id}"]`
      );
    });
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

  async clickHomeBreadcrumb() {
    await this.testSubjects.click('breadcrumb first');
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
