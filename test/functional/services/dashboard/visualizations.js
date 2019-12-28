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

export function DashboardVisualizationProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'visEditor', 'header', 'discover']);

  return new (class DashboardVisualizations {
    async createAndAddTSVBVisualization(name) {
      log.debug(`createAndAddTSVBVisualization(${name})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await dashboardAddPanel.ensureAddPanelIsShowing();
      await dashboardAddPanel.clickAddNewEmbeddableLink('visualization');
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualize.saveVisualizationExpectSuccess(name);
    }

    async createSavedSearch({ name, query, fields }) {
      log.debug(`createSavedSearch(${name})`);
      await PageObjects.header.clickDiscover();

      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();

      if (query) {
        await queryBar.setQuery(query);
        await queryBar.submitQuery();
      }

      if (fields) {
        for (let i = 0; i < fields.length; i++) {
          await PageObjects.discover.clickFieldListItemAdd(fields[i]);
        }
      }

      await PageObjects.discover.saveSearch(name);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.exists('saveSearchSuccess');
    }

    async createAndAddSavedSearch({ name, query, fields }) {
      log.debug(`createAndAddSavedSearch(${name})`);
      await this.createSavedSearch({ name, query, fields });

      await PageObjects.header.clickDashboard();

      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await dashboardAddPanel.addSavedSearch(name);
    }

    async clickAddVisualizationButton() {
      log.debug('DashboardVisualizations.clickAddVisualizationButton');
      await testSubjects.click('addVisualizationButton');
    }

    async isNewVisDialogShowing() {
      log.debug('DashboardVisualizations.isNewVisDialogShowing');
      return await find.existsByCssSelector('.visNewVisDialog');
    }

    async ensureNewVisualizationDialogIsShowing() {
      let isShowing = await this.isNewVisDialogShowing();
      log.debug(`DashboardVisualizations.ensureNewVisualizationDialogIsShowing:${isShowing}`);
      if (!isShowing) {
        await retry.try(async () => {
          await this.clickAddVisualizationButton();
          isShowing = await this.isNewVisDialogShowing();
          log.debug(`DashboardVisualizations.ensureNewVisualizationDialogIsShowing:${isShowing}`);
          if (!isShowing) {
            throw new Error('New Vis Dialog still not open, trying again.');
          }
        });
      }
    }

    async createAndAddMarkdown({ name, markdown }) {
      log.debug(`createAndAddMarkdown(${markdown})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await this.ensureNewVisualizationDialogIsShowing();
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visualize.setMarkdownTxt(markdown);
      await PageObjects.visEditor.clickGo();
      await PageObjects.visualize.saveVisualizationExpectSuccess(name);
    }
  })();
}
