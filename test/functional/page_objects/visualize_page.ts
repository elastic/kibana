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

import { FtrProviderContext } from '../ftr_provider_context';
import { VisualizeConstants } from '../../../src/legacy/core_plugins/kibana/public/visualize/np_ready/visualize_constants';

export function VisualizePageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const globalNav = getService('globalNav');
  const listingTable = getService('listingTable');
  const { common, header, visEditor } = getPageObjects(['common', 'header', 'visEditor']);

  class VisualizePage {
    defaultIndex = {
      LOGSTASH_TIME_BASED: 'logstash-*',
      LOGSTASH_NON_TIME_BASED: 'logstash*',
    };

    async gotoVisualizationLandingPage() {
      log.debug('gotoVisualizationLandingPage');
      await common.navigateToApp('visualize');
    }

    async clickNewVisualization() {
      // newItemButton button is only visible when there are items in the listing table is displayed.
      const exists = await testSubjects.exists('newItemButton');
      if (exists) {
        return await testSubjects.click('newItemButton');
      }
    }

    async waitForVisualizationSelectPage() {
      await retry.try(async () => {
        const visualizeSelectTypePage = await testSubjects.find('visNewDialogTypes');
        if (!(await visualizeSelectTypePage.isDisplayed())) {
          throw new Error('wait for visualization select page');
        }
      });
    }

    async navigateToNewVisualization() {
      log.debug('navigateToApp visualize');
      await common.navigateToApp('visualize');
      await this.clickNewVisualization();
      await this.waitForVisualizationSelectPage();
    }

    async clickVisType(type: string) {
      await testSubjects.click(`visType-${type}`);
      await header.waitUntilLoadingHasFinished();
    }

    async clickAreaChart() {
      await this.clickVisType('area');
    }

    async clickDataTable() {
      await this.clickVisType('table');
    }

    async clickLineChart() {
      await this.clickVisType('line');
    }

    async clickRegionMap() {
      await this.clickVisType('region_map');
    }

    async clickMarkdownWidget() {
      await this.clickVisType('markdown');
    }

    async clickMetric() {
      await this.clickVisType('metric');
    }

    async clickGauge() {
      await this.clickVisType('gauge');
    }

    async clickPieChart() {
      await this.clickVisType('pie');
    }

    async clickTileMap() {
      await this.clickVisType('tile_map');
    }

    async clickTagCloud() {
      await this.clickVisType('tagcloud');
    }

    async clickVega() {
      await this.clickVisType('vega');
    }

    async clickVisualBuilder() {
      await this.clickVisType('metrics');
    }

    async clickVerticalBarChart() {
      await this.clickVisType('histogram');
    }

    async clickHeatmapChart() {
      await this.clickVisType('heatmap');
    }

    async clickInputControlVis() {
      await this.clickVisType('input_control_vis');
    }

    async createSimpleMarkdownViz(vizName: string) {
      await this.gotoVisualizationLandingPage();
      await this.navigateToNewVisualization();
      await this.clickMarkdownWidget();
      await visEditor.setMarkdownTxt(vizName);
      await visEditor.clickGo();
      await this.saveVisualization(vizName);
    }

    async getCountOfItemsInListingTable() {
      const elements = await find.allByCssSelector('[data-test-subj^="visListingTitleLink"]');
      return elements.length;
    }

    async clickNewSearch(indexPattern = this.defaultIndex.LOGSTASH_TIME_BASED) {
      await testSubjects.click(`savedObjectTitle${indexPattern.split(' ').join('-')}`);
      await header.waitUntilLoadingHasFinished();
    }

    async selectVisSourceIfRequired() {
      log.debug('selectVisSourceIfRequired');
      const selectPage = await testSubjects.findAll('visualizeSelectSearch');
      if (selectPage.length) {
        log.debug('a search is required for this visualization');
        await this.clickNewSearch();
      }
    }

    /*
    This method should use retry loop to delete visualizations from multiple pages until we find the createVisualizationPromptButton.
    Perhaps it *could* set the page size larger than the default 10, but it might still need to loop anyway.
    */
    async deleteAllVisualizations() {
      await retry.try(async () => {
        await listingTable.checkListingSelectAllCheckbox();
        await listingTable.clickDeleteSelected();
        await common.clickConfirmOnModal();
        await testSubjects.find('createVisualizationPromptButton');
      });
    }

    async isBetaInfoShown() {
      return await testSubjects.exists('betaVisInfo');
    }

    async getBetaTypeLinks() {
      return await find.allByCssSelector('[data-vis-stage="beta"]');
    }

    async getExperimentalTypeLinks() {
      return await find.allByCssSelector('[data-vis-stage="experimental"]');
    }

    async isExperimentalInfoShown() {
      return await testSubjects.exists('experimentalVisInfo');
    }

    async getExperimentalInfo() {
      return await testSubjects.find('experimentalVisInfo');
    }

    async getSideEditorExists() {
      return await find.existsByCssSelector('.collapsible-sidebar');
    }

    async clickSavedSearch(savedSearchName: string) {
      await testSubjects.click(`savedObjectTitle${savedSearchName.split(' ').join('-')}`);
      await header.waitUntilLoadingHasFinished();
    }

    async clickUnlinkSavedSearch() {
      await testSubjects.doubleClick('unlinkSavedSearch');
      await header.waitUntilLoadingHasFinished();
    }

    async ensureSavePanelOpen() {
      log.debug('ensureSavePanelOpen');
      await header.waitUntilLoadingHasFinished();
      const isOpen = await testSubjects.exists('savedObjectSaveModal', { timeout: 5000 });
      if (!isOpen) {
        await testSubjects.click('visualizeSaveButton');
      }
    }

    async clickLoadSavedVisButton() {
      // TODO: Use a test subject selector once we rewrite breadcrumbs to accept each breadcrumb
      // element as a child instead of building the breadcrumbs dynamically.
      await find.clickByCssSelector('[href="#/visualize"]');
    }

    async clickVisualizationByName(vizName: string) {
      log.debug('clickVisualizationByLinkText(' + vizName + ')');
      return find.clickByPartialLinkText(vizName);
    }

    async loadSavedVisualization(vizName: string, { navigateToVisualize = true } = {}) {
      if (navigateToVisualize) {
        await this.clickLoadSavedVisButton();
      }
      await this.openSavedVisualization(vizName);
    }

    async openSavedVisualization(vizName: string) {
      await this.clickVisualizationByName(vizName);
      await header.waitUntilLoadingHasFinished();
    }

    async waitForVisualizationSavedToastGone() {
      return await testSubjects.waitForDeleted('saveVisualizationSuccess');
    }

    async clickLandingPageBreadcrumbLink() {
      log.debug('clickLandingPageBreadcrumbLink');
      await find.clickByCssSelector(`a[href="#${VisualizeConstants.LANDING_PAGE_PATH}"]`);
    }

    /**
     * Returns true if already on the landing page (that page doesn't have a link to itself).
     * @returns {Promise<boolean>}
     */
    async onLandingPage() {
      log.debug(`VisualizePage.onLandingPage`);
      const exists = await testSubjects.exists('visualizeLandingPage');
      return exists;
    }

    async gotoLandingPage() {
      log.debug('VisualizePage.gotoLandingPage');
      const onPage = await this.onLandingPage();
      if (!onPage) {
        await retry.try(async () => {
          await this.clickLandingPageBreadcrumbLink();
          const onLandingPage = await this.onLandingPage();
          if (!onLandingPage) throw new Error('Not on the landing page.');
        });
      }
    }

    async saveVisualization(vizName: string, { saveAsNew = false } = {}) {
      await this.ensureSavePanelOpen();
      await testSubjects.setValue('savedObjectTitle', vizName);
      if (saveAsNew) {
        log.debug('Check save as new visualization');
        await testSubjects.click('saveAsNewCheckbox');
      }
      log.debug('Click Save Visualization button');

      await testSubjects.click('confirmSaveSavedObjectButton');

      // Confirm that the Visualization has actually been saved
      await testSubjects.existOrFail('saveVisualizationSuccess');
      const message = await common.closeToast();
      await header.waitUntilLoadingHasFinished();
      await common.waitForSaveModalToClose();

      return message;
    }

    async saveVisualizationExpectSuccess(vizName: string, { saveAsNew = false } = {}) {
      const saveMessage = await this.saveVisualization(vizName, { saveAsNew });
      if (!saveMessage) {
        throw new Error(
          `Expected saveVisualization to respond with the saveMessage from the toast, got ${saveMessage}`
        );
      }
    }

    async saveVisualizationExpectSuccessAndBreadcrumb(vizName: string, { saveAsNew = false } = {}) {
      await this.saveVisualizationExpectSuccess(vizName, { saveAsNew });
      await retry.waitFor(
        'last breadcrumb to have new vis name',
        async () => (await globalNav.getLastBreadcrumb()) === vizName
      );
    }
  }

  return new VisualizePage();
}
