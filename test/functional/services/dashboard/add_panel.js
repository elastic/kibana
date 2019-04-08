/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


export function DashboardAddPanelProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');
  const PageObjects = getPageObjects(['header', 'common']);

  return new class DashboardAddPanel {
    async clickOpenAddPanel() {
      log.debug('DashboardAddPanel.clickOpenAddPanel');
      await testSubjects.click('dashboardAddPanelButton');
    }

    async clickAddNewEmbeddableLink() {
      await testSubjects.click('addNewSavedObjectLink');
    }

    async toggleFilterPopover() {
      log.debug('DashboardAddPanel.toggleFilter');
      await testSubjects.click('savedObjectFinderFilterButton');
    }

    async toggleFilter(type) {
      log.debug(`DashboardAddPanel.addToFilter(${type})`);
      await this.waitForListLoading();
      await this.toggleFilterPopover();
      await testSubjects.click(`savedObjectFinderFilter-${type}`);
      await this.toggleFilterPopover();
    }

    async addEveryEmbeddableOnCurrentPage() {
      log.debug('addEveryEmbeddableOnCurrentPage');
      const itemList = await testSubjects.find('savedObjectFinderItemList');
      const embeddableRows = await itemList.findAllByCssSelector('li');
      for (let i = 0; i < embeddableRows.length; i++) {
        await embeddableRows[i].click();
        await PageObjects.common.closeToast();
      }
      log.debug(`Added ${embeddableRows.length} embeddables`);
    }

    async clickPagerNextButton() {
      // Clear all toasts that could hide pagination controls
      await PageObjects.common.clearAllToasts();

      const addPanel = await testSubjects.find('dashboardAddPanel');
      const pagination = await addPanel.findAllByClassName('euiPagination');
      if (pagination.length === 0) {
        return false;
      }

      const pagerNextButton = await pagination[0].findByCssSelector('button[aria-label="Next page"]');
      if (!pagerNextButton) {
        return false;
      }

      const isDisabled = await pagerNextButton.getAttribute('disabled');
      if (isDisabled != null) {
        return false;
      }

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
          const isOpen = await this.isAddPanelOpen();
          if (!isOpen) {
            throw new Error('Add panel still not open, trying again.');
          }
        });
      }
    }

    async waitForListLoading() {
      await retry.waitFor('dashboard add panel loading to complete', async () => {
        return !(await testSubjects.exists('savedObjectFinderLoadingIndicator'));
      });
    }

    async closeAddPanel() {
      await flyout.ensureClosed('dashboardAddPanel');
    }

    async addEveryVisualization(filter) {
      log.debug('DashboardAddPanel.addEveryVisualization');
      await this.ensureAddPanelIsShowing();
      await this.toggleFilter('visualization');
      if (filter) {
        await this.filterEmbeddableNames(filter.replace('-', ' '));
      }
      let morePages = true;
      while (morePages) {
        await this.addEveryEmbeddableOnCurrentPage();
        morePages = await this.clickPagerNextButton();
      }
      await this.closeAddPanel();
    }

    async addEverySavedSearch(filter) {
      log.debug('DashboardAddPanel.addEverySavedSearch');
      await this.ensureAddPanelIsShowing();
      await this.toggleFilter('search');
      if (filter) {
        await this.filterEmbeddableNames(filter.replace('-', ' '));
      }
      let morePages = true;
      while (morePages) {
        await this.addEveryEmbeddableOnCurrentPage();
        morePages = await this.clickPagerNextButton();
      }
      await this.closeAddPanel();
    }

    async addSavedSearch(searchName) {
      log.debug(`addSavedSearch(${searchName})`);

      await this.ensureAddPanelIsShowing();
      await this.toggleFilter('search');
      await this.filterEmbeddableNames(searchName);

      await testSubjects.click(`savedObjectTitle${searchName.split(' ').join('-')}`);
      await testSubjects.exists('addObjectToDashboardSuccess');
      await this.closeAddPanel();
    }

    async addSavedSearches(searches) {
      for (const name of searches) {
        await this.addSavedSearch(name);
      }
    }

    async addVisualizations(visualizations) {
      log.debug('DashboardAddPanel.addVisualizations');
      for (const vizName of visualizations) {
        await this.addVisualization(vizName);
      }
    }

    async addVisualization(vizName) {
      log.debug(`DashboardAddPanel.addVisualization(${vizName})`);
      await this.ensureAddPanelIsShowing();
      await this.toggleFilter('visualization');
      await this.filterEmbeddableNames(`"${vizName.replace('-', ' ')}"`);
      await testSubjects.click(`savedObjectTitle${vizName.split(' ').join('-')}`);
      await testSubjects.exists('addObjectToDashboardSuccess');
      await this.closeAddPanel();
    }

    async filterEmbeddableNames(name) {
      // The search input field may be disabled while the table is loading so wait for it
      await this.waitForListLoading();
      await testSubjects.setValue('savedObjectFinderSearchInput', name);
      await this.waitForListLoading();
    }

    async panelAddLinkExists(name) {
      log.debug(`DashboardAddPanel.panelAddLinkExists(${name})`);
      await this.ensureAddPanelIsShowing();
      await this.filterEmbeddableNames(`"${name}"`);
      return await testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
    }
  };
}
