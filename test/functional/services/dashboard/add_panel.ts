/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function DashboardAddPanelProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');
  const PageObjects = getPageObjects(['header', 'common']);

  return new (class DashboardAddPanel {
    async clickOpenAddPanel() {
      log.debug('DashboardAddPanel.clickOpenAddPanel');
      await testSubjects.click('dashboardAddPanelButton');
      // Give some time for the animation to complete
      await PageObjects.common.sleep(500);
    }

    async clickCreateNewLink() {
      log.debug('DashboardAddPanel.clickAddNewPanelButton');
      await testSubjects.click('dashboardAddNewPanelButton');
      // Give some time for the animation to complete
      await PageObjects.common.sleep(500);
    }

    async clickQuickButton(visType: string) {
      log.debug(`DashboardAddPanel.clickQuickButton${visType}`);
      await testSubjects.click(`dashboardQuickButton${visType}`);
    }

    async clickMarkdownQuickButton() {
      await this.clickQuickButton('markdown');
    }

    async clickMapQuickButton() {
      await this.clickQuickButton('map');
    }

    async clickEditorMenuButton() {
      log.debug('DashboardAddPanel.clickEditorMenuButton');
      await testSubjects.click('dashboardEditorMenuButton');
    }

    async clickAggBasedVisualizations() {
      log.debug('DashboardAddPanel.clickEditorMenuAggBasedMenuItem');
      await testSubjects.click('dashboardEditorAggBasedMenuItem');
    }

    async clickVisType(visType: string) {
      log.debug('DashboardAddPanel.clickVisType');
      await testSubjects.click(`visType-${visType}`);
    }

    async clickEmbeddableFactoryGroupButton(groupId: string) {
      log.debug('DashboardAddPanel.clickEmbeddableFactoryGroupButton');
      await testSubjects.click(`dashboardEditorMenu-${groupId}Group`);
    }

    async clickAddNewEmbeddableLink(type: string) {
      await testSubjects.click(`createNew-${type}`);
    }

    async toggleFilterPopover() {
      log.debug('DashboardAddPanel.toggleFilter');
      await testSubjects.click('savedObjectFinderFilterButton');
    }

    async toggleFilter(type: string) {
      log.debug(`DashboardAddPanel.addToFilter(${type})`);
      await this.waitForListLoading();
      await this.toggleFilterPopover();
      await testSubjects.click(`savedObjectFinderFilter-${type}`);
      await this.toggleFilterPopover();
    }

    async addEveryEmbeddableOnCurrentPage() {
      log.debug('addEveryEmbeddableOnCurrentPage');
      const itemList = await testSubjects.find('savedObjectFinderItemList');
      const embeddableList: string[] = [];
      await retry.try(async () => {
        const embeddableRows = await itemList.findAllByCssSelector('li');
        for (let i = 0; i < embeddableRows.length; i++) {
          const name = await embeddableRows[i].getVisibleText();

          if (embeddableList.includes(name)) {
            // already added this one
            continue;
          }

          await embeddableRows[i].click();
          await PageObjects.common.closeToast();
          embeddableList.push(name);
        }
      });
      log.debug(`Added ${embeddableList.length} embeddables`);
      return embeddableList;
    }

    async clickPagerNextButton() {
      // Clear all toasts that could hide pagination controls
      await PageObjects.common.clearAllToasts();

      const isNext = await testSubjects.exists('pagination-button-next');
      if (!isNext) {
        return false;
      }

      const pagerNextButton = await testSubjects.find('pagination-button-next');

      const isDisabled = await pagerNextButton.getAttribute('disabled');
      if (isDisabled != null) {
        return false;
      }

      await PageObjects.header.waitUntilLoadingHasFinished();
      await pagerNextButton.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      return true;
    }

    async isAddPanelOpen() {
      log.debug('DashboardAddPanel.isAddPanelOpen');
      return await testSubjects.exists('dashboardAddPanel');
    }

    async ensureAddPanelIsShowing() {
      log.debug('DashboardAddPanel.ensureAddPanelIsShowing');
      const isOpen = await this.isAddPanelOpen();
      if (!isOpen) {
        await retry.try(async () => {
          await this.clickOpenAddPanel();
          const isNowOpen = await this.isAddPanelOpen();
          if (!isNowOpen) {
            throw new Error('Add panel still not open, trying again.');
          }
        });
      }
    }

    async waitForListLoading() {
      await testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
    }

    async closeAddPanel() {
      await flyout.ensureClosed('dashboardAddPanel');
    }

    async addEveryVisualization(filter: string) {
      log.debug('DashboardAddPanel.addEveryVisualization');
      await this.ensureAddPanelIsShowing();
      await this.toggleFilter('visualization');
      if (filter) {
        await this.filterEmbeddableNames(filter.replace('-', ' '));
      }
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
      log.debug('DashboardAddPanel.addEverySavedSearch');
      await this.ensureAddPanelIsShowing();
      await this.toggleFilter('search');
      const searchList = [];
      if (filter) {
        await this.filterEmbeddableNames(filter.replace('-', ' '));
      }
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
      log.debug('DashboardAddPanel.addVisualizations');
      const vizList = [];
      for (const vizName of visualizations) {
        await this.addVisualization(vizName);
        vizList.push(vizName);
      }
      return vizList;
    }

    async addVisualization(vizName: string) {
      return this.addEmbeddable(vizName, 'visualization');
    }

    async addEmbeddable(embeddableName: string, embeddableType: string) {
      log.debug(
        `DashboardAddPanel.addEmbeddable, name: ${embeddableName}, type: ${embeddableType}`
      );
      await this.ensureAddPanelIsShowing();
      await this.toggleFilter(embeddableType);
      await this.filterEmbeddableNames(`"${embeddableName.replace('-', ' ')}"`);
      await testSubjects.click(`savedObjectTitle${embeddableName.split(' ').join('-')}`);
      await testSubjects.exists('addObjectToDashboardSuccess');
      await this.closeAddPanel();
      return embeddableName;
    }

    async filterEmbeddableNames(name: string) {
      // The search input field may be disabled while the table is loading so wait for it
      await this.waitForListLoading();
      await testSubjects.setValue('savedObjectFinderSearchInput', name);
      await this.waitForListLoading();
    }

    async panelAddLinkExists(name: string) {
      log.debug(`DashboardAddPanel.panelAddLinkExists(${name})`);
      await this.ensureAddPanelIsShowing();
      await this.filterEmbeddableNames(`"${name}"`);
      return await testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
    }
  })();
}
