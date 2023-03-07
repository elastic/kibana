/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FtrService } from '../../ftr_provider_context';

export class DashboardAddPanelService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly savedObjectsFinder = this.ctx.getService('savedObjectsFinder');

  async clickOpenAddPanel() {
    this.log.debug('DashboardAddPanel.clickOpenAddPanel');
    await this.testSubjects.click('dashboardAddPanelButton');
    // Give some time for the animation to complete
    await this.common.sleep(500);
  }

  async clickCreateNewLink() {
    this.log.debug('DashboardAddPanel.clickAddNewPanelButton');
    await this.retry.try(async () => {
      await this.testSubjects.click('dashboardAddNewPanelButton');
      await this.testSubjects.waitForDeleted('dashboardAddNewPanelButton');
      await this.header.waitUntilLoadingHasFinished();
      await this.testSubjects.existOrFail('lnsApp', {
        timeout: 5000,
      });
    });
  }

  async clickQuickButton(visType: string) {
    this.log.debug(`DashboardAddPanel.clickQuickButton${visType}`);
    await this.testSubjects.click(`dashboardQuickButton${visType}`);
  }

  async clickMarkdownQuickButton() {
    await this.clickQuickButton('markdown');
  }

  async clickMapQuickButton() {
    await this.clickQuickButton('map');
  }

  async clickEditorMenuButton() {
    this.log.debug('DashboardAddPanel.clickEditorMenuButton');
    await this.testSubjects.click('dashboardEditorMenuButton');
    await this.testSubjects.existOrFail('dashboardEditorContextMenu');
  }

  async expectEditorMenuClosed() {
    await this.testSubjects.missingOrFail('dashboardEditorContextMenu');
  }

  async clickAggBasedVisualizations() {
    this.log.debug('DashboardAddPanel.clickEditorMenuAggBasedMenuItem');
    await this.testSubjects.click('dashboardEditorAggBasedMenuItem');
  }

  async clickVisType(visType: string) {
    this.log.debug('DashboardAddPanel.clickVisType');
    await this.testSubjects.click(`visType-${visType}`);
  }

  async clickEmbeddableFactoryGroupButton(groupId: string) {
    this.log.debug('DashboardAddPanel.clickEmbeddableFactoryGroupButton');
    await this.testSubjects.click(`dashboardEditorMenu-${groupId}Group`);
  }

  async clickAddNewEmbeddableLink(type: string) {
    await this.testSubjects.click(`createNew-${type}`);
  }

  async addEveryEmbeddableOnCurrentPage() {
    this.log.debug('addEveryEmbeddableOnCurrentPage');
    const itemList = await this.testSubjects.find('savedObjectsFinderTable');
    const embeddableList: string[] = [];
    await this.retry.try(async () => {
      const embeddableListBody = await itemList.findByTagName('tbody');
      const embeddableRows = await embeddableListBody.findAllByCssSelector('tr');
      for (let i = 0; i < embeddableRows.length; i++) {
        const { name, button } = await this.savedObjectsFinder.getRowAtIndex(embeddableRows, i);
        if (embeddableList.includes(name)) {
          // already added this one
          continue;
        }
        await button.click();
        await this.common.closeToast();
        embeddableList.push(name);
      }
    });
    this.log.debug(`Added ${embeddableList.length} embeddables`);
    return embeddableList;
  }

  async clickPagerNextButton() {
    // Clear all toasts that could hide pagination controls
    await this.common.clearAllToasts();

    const addPanel = await this.testSubjects.find('dashboardAddPanel');

    const isNext = await this.testSubjects.descendantExists('pagination-button-next', addPanel);
    if (!isNext) {
      return false;
    }

    const pagerNextButton = await this.testSubjects.findDescendant(
      'pagination-button-next',
      addPanel
    );

    const isDisabled = await pagerNextButton.getAttribute('disabled');
    if (isDisabled != null) {
      return false;
    }

    await this.header.waitUntilLoadingHasFinished();
    await pagerNextButton.click();
    await this.header.waitUntilLoadingHasFinished();
    return true;
  }

  async isAddPanelOpen() {
    this.log.debug('DashboardAddPanel.isAddPanelOpen');
    return await this.testSubjects.exists('dashboardAddPanel');
  }

  async ensureAddPanelIsShowing() {
    this.log.debug('DashboardAddPanel.ensureAddPanelIsShowing');
    const isOpen = await this.isAddPanelOpen();
    if (!isOpen) {
      await this.retry.try(async () => {
        await this.clickOpenAddPanel();
        const isNowOpen = await this.isAddPanelOpen();
        if (!isNowOpen) {
          throw new Error('Add panel still not open, trying again.');
        }
      });
    }
  }

  async closeAddPanel() {
    await this.flyout.ensureClosed('dashboardAddPanel');
  }

  async filterEmbeddableNames(name: string) {
    await this.savedObjectsFinder.filterEmbeddableNames(name);
  }

  async addEveryVisualization(filter: string) {
    this.log.debug('DashboardAddPanel.addEveryVisualization');
    await this.ensureAddPanelIsShowing();
    if (filter) {
      await this.filterEmbeddableNames(filter.replace('-', ' '));
    }
    await this.savedObjectsFinder.waitForFilter('Visualization', 'search');
    let morePages = true;
    const vizList: string[][] = [];
    while (morePages) {
      vizList.push(await this.addEveryEmbeddableOnCurrentPage());
      morePages = await this.clickPagerNextButton();
    }
    await this.closeAddPanel();
    return vizList.reduce((acc, list) => [...acc, ...list], []);
  }

  async addEverySavedSearch(filter: string) {
    this.log.debug('DashboardAddPanel.addEverySavedSearch');
    await this.ensureAddPanelIsShowing();
    const searchList = [];
    if (filter) {
      await this.filterEmbeddableNames(filter.replace('-', ' '));
    }
    await this.savedObjectsFinder.waitForFilter('Saved search', 'visualization');
    let morePages = true;
    while (morePages) {
      searchList.push(await this.addEveryEmbeddableOnCurrentPage());
      morePages = await this.clickPagerNextButton();
    }
    await this.closeAddPanel();
    return searchList.reduce((acc, list) => [...acc, ...list], []);
  }

  async addSavedSearch(searchName: string) {
    return this.addEmbeddable(searchName, 'search');
  }

  async addSavedSearches(searches: string[]) {
    for (const name of searches) {
      await this.addSavedSearch(name);
    }
  }

  async addVisualizations(visualizations: string[]) {
    this.log.debug('DashboardAddPanel.addVisualizations');
    const vizList = [];
    for (const vizName of visualizations) {
      await this.addVisualization(vizName);
      vizList.push(vizName);
    }
    return vizList;
  }

  async addVisualization(vizName: string) {
    this.log.debug(`DashboardAddPanel.addVisualization, ${vizName}`);
    return this.addEmbeddable(vizName, 'Visualization');
  }

  async addEmbeddable(embeddableName: string, embeddableType: string) {
    this.log.debug(
      `DashboardAddPanel.addEmbeddable, name: ${embeddableName}, type: ${embeddableType}`
    );
    await this.ensureAddPanelIsShowing();
    await this.savedObjectsFinder.toggleFilter(embeddableType);
    await this.savedObjectsFinder.filterEmbeddableNames(`"${embeddableName.replace('-', ' ')}"`);
    await this.testSubjects.click(`savedObjectTitle${embeddableName.split(' ').join('-')}`);
    await this.testSubjects.exists('addObjectToDashboardSuccess');
    await this.closeAddPanel();
    return embeddableName;
  }

  async panelAddLinkExists(name: string) {
    this.log.debug(`DashboardAddPanel.panelAddLinkExists(${name})`);
    await this.ensureAddPanelIsShowing();
    await this.savedObjectsFinder.filterEmbeddableNames(`"${name}"`);
    return await this.testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
  }
}
