/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { FtrService } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

export class DashboardAddPanelService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');

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

  async toggleFilterPopover() {
    this.log.debug('DashboardAddPanel.toggleFilter');
    const filtersHolder = await this.find.byClassName('euiSearchBar__filtersHolder');
    const filtersButton = await filtersHolder.findByCssSelector('button');
    await filtersButton.click();
  }

  async toggleFilter(type: string) {
    this.log.debug(`DashboardAddPanel.addToFilter(${type})`);
    await this.waitForListLoading();
    await this.toggleFilterPopover();
    await this.common.sleep(1000);
    const list = await this.testSubjects.find('euiSelectableList');
    const listItems = await list.findAllByCssSelector('li');
    for (let i = 0; i < listItems.length; i++) {
      const listItem = await listItems[i].findByClassName('euiSelectableListItem__text');
      const text = await listItem.getVisibleText();
      if (text.includes(type)) {
        await listItem.click();
        await this.toggleFilterPopover();
        break;
      }
    }
  }

  async addEveryEmbeddableOnCurrentPage() {
    this.log.debug('addEveryEmbeddableOnCurrentPage');
    const itemList = await this.testSubjects.find('savedObjectsFinder-table');
    const embeddableList: string[] = [];
    await this.retry.try(async () => {
      const embeddableListBody = await itemList.findByTagName('tbody');
      const embeddableRows = await embeddableListBody.findAllByCssSelector('tr');
      for (let i = 0; i < embeddableRows.length; i++) {
        const { name, button } = await this.getRowAtIndex(embeddableRows, i);
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

  async waitForListLoading() {
    await this.testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
  }

  async closeAddPanel() {
    await this.flyout.ensureClosed('dashboardAddPanel');
  }

  async getRowAtIndex(rows: WebElementWrapper[], rowIndex: number) {
    const cell = await rows[rowIndex].findByTestSubject('savedObjectFinderTitle');
    const button = await cell.findByTagName('button');
    const name = await button.getVisibleText();
    return { button, name };
  }

  async addEveryVisualization(filter: string) {
    this.log.debug('DashboardAddPanel.addEveryVisualization');
    await this.ensureAddPanelIsShowing();
    if (filter) {
      await this.filterEmbeddableNames(filter.replace('-', ' '));
    }
    await this.toggleFilter('Visualization');
    const itemList = await this.testSubjects.find('savedObjectsFinder-table');
    await this.retry.try(async () => {
      const embeddableListBody = await itemList.findByTagName('tbody');
      const embeddableRows = await embeddableListBody.findAllByCssSelector('tr');
      const { name } = await this.getRowAtIndex(embeddableRows, 0);
      expect(name.includes('saved search')).to.be(false);
    });
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
    await this.toggleFilter('Saved search');
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
    await this.toggleFilter(embeddableType);
    await this.filterEmbeddableNames(`"${embeddableName.replace('-', ' ')}"`);
    await this.testSubjects.click(`savedObjectTitle${embeddableName.split(' ').join('-')}`);
    await this.testSubjects.exists('addObjectToDashboardSuccess');
    await this.closeAddPanel();
    return embeddableName;
  }

  async filterEmbeddableNames(name: string) {
    // The search input field may be disabled while the table is loading so wait for it
    await this.waitForListLoading();
    await this.testSubjects.setValue('savedObjectFinderSearchInput', name);
    await this.waitForListLoading();
  }

  async panelAddLinkExists(name: string) {
    this.log.debug(`DashboardAddPanel.panelAddLinkExists(${name})`);
    await this.ensureAddPanelIsShowing();
    await this.filterEmbeddableNames(`"${name}"`);
    return await this.testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
  }
}
