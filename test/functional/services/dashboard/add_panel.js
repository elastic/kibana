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
  const find = getService('find');
  const PageObjects = getPageObjects(['header']);

  return new class DashboardAddPanel {
    async clickOpenAddPanel() {
      log.debug('DashboardAddPanel.clickOpenAddPanel');
      await testSubjects.click('dashboardAddPanelButton');
    }

    async clickAddNewEmbeddableLink() {
      await testSubjects.click('addNewSavedObjectLink');
    }

    async closeAddVizualizationPanel() {
      log.debug('closeAddVizualizationPanel');
      await find.clickByCssSelector('i.fa fa-chevron-up');
    }

    async clickSavedSearchTab() {
      await testSubjects.click('addSavedSearchTab');
    }

    async addEveryEmbeddableOnCurrentPage() {
      log.debug('addEveryEmbeddableOnCurrentPage');
      const embeddableRows = await find.allByCssSelector('.list-group-menu-item');
      for (let i = 0; i < embeddableRows.length; i++) {
        await embeddableRows[i].click();
      }
      log.debug(`Added ${embeddableRows.length} embeddables`);
    }

    async clickPagerNextButton() {
      const pagerNextButtonExists = await testSubjects.exists('paginateNext');
      if (pagerNextButtonExists) {
        await testSubjects.click('paginateNext');
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
      return pagerNextButtonExists;
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

    async closeAddPanel() {
      log.debug('closeAddPanel');
      const isOpen = await this.isAddPanelOpen();
      if (isOpen) {
        await retry.try(async () => {
          await this.clickOpenAddPanel();
          const isOpen = await this.isAddPanelOpen();
          if (isOpen) {
            throw new Error('Add panel still open, trying again.');
          }
        });
      }
    }

    async addEveryVisualization(filter) {
      log.debug('DashboardAddPanel.addEveryVisualization');
      await this.ensureAddPanelIsShowing();
      if (filter) {
        await this.filterEmbeddableNames(filter.replace('-', ' '));
      }
      let morePages = true;
      while (morePages) {
        await this.addEveryEmbeddableOnCurrentPage();
        morePages = await this.clickPagerNextButton();
      }
    }

    async addEverySavedSearch(filter) {
      log.debug('DashboardAddPanel.addEverySavedSearch');
      await this.ensureAddPanelIsShowing();
      await this.clickSavedSearchTab();
      if (filter) {
        await this.filterEmbeddableNames(filter.replace('-', ' '));
      }
      let morePages = true;
      while (morePages) {
        await this.addEveryEmbeddableOnCurrentPage();
        morePages = await this.clickPagerNextButton();
      }
    }

    async addSavedSearch(searchName) {
      log.debug(`addSavedSearch(${searchName})`);

      await this.ensureAddPanelIsShowing();
      await this.clickSavedSearchTab();
      await this.filterEmbeddableNames(searchName);

      await find.clickByPartialLinkText(searchName);
      await testSubjects.exists('addSavedSearchToDashboardSuccess');
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
      await this.filterEmbeddableNames(`"${vizName.replace('-', ' ')}"`);
      await find.clickByPartialLinkText(vizName);
      await this.closeAddPanel();
    }

    async filterEmbeddableNames(name) {
      await testSubjects.setValue('savedObjectFinderSearchInput', name);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }
  };
}
