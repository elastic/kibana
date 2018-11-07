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

import { VisualizeConstants } from '../../../src/core_plugins/kibana/public/visualize/visualize_constants';
import Bluebird from 'bluebird';
import expect from 'expect.js';
import { By } from 'selenium-webdriver';
import Keys from 'leadfoot/keys';

export function VisualizePageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const flyout = getService('flyout');
  const renderable = getService('renderable');
  const PageObjects = getPageObjects(['common', 'header']);
  const defaultFindTimeout = config.get('timeouts.find');

  class VisualizePage {

    get index() {
      return {
        LOGSTASH_TIME_BASED: 'logstash-*',
        LOGSTASH_NON_TIME_BASED: 'logstash*'
      };
    }

    async navigateToNewVisualization() {
      log.debug('navigateToApp visualize new');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await this.waitForVisualizationSelectPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async waitForVisualizationSelectPage() {
      await retry.try(async () => {
        const visualizeSelectTypePage = await testSubjects.find('visualizeSelectTypePage');
        if (!visualizeSelectTypePage.isDisplayed()) {
          throw new Error('wait for visualization select page');
        }
      });
    }

    async clickAreaChart() {
      await remote.click(By.partialLinkText('Area'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickDataTable() {
      await remote.click(By.partialLinkText('Data Table'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickLineChart() {
      await remote.click(By.partialLinkText('Line'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickRegionMap() {
      await remote.click(By.partialLinkText('Region Map'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMarkdownWidget() {
      await remote.click(By.partialLinkText('Markdown'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickAddMetric() {
      await remote.click(By.css('[group-name="metrics"] [data-test-subj="visualizeEditorAddAggregationButton"]'));
    }

    async clickAddBucket() {
      await remote.click(By.css('[group-name="buckets"] [data-test-subj="visualizeEditorAddAggregationButton"]'));
    }

    async clickMetric() {
      await remote.click(By.partialLinkText('Metric'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickGauge() {
      await remote.click(By.partialLinkText('Gauge'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickPieChart() {
      await remote.click(By.partialLinkText('Pie'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickTileMap() {
      await remote.click(By.partialLinkText('Coordinate Map'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickTagCloud() {
      await remote.click(By.partialLinkText('Tag Cloud'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVega() {
      await remote.click(By.partialLinkText('Vega'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVisualBuilder() {
      await remote.click(By.partialLinkText('Visual Builder'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickEditorSidebarCollapse() {
      await testSubjects.click('collapseSideBarButton');
    }

    async selectTagCloudTag(tagDisplayText) {
      await testSubjects.click(tagDisplayText);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getTextTag() {
      const elements = await remote.findElements(By.css('text'));
      return await Promise.all(elements.map(async element => await element.getText()));
    }

    async getTextSizes() {
      const tags = await remote.findElements(By.css('text'));
      async function returnTagSize(tag) {
        const style = await tag.getAttribute('style');
        return style.match(/font-size: ([^;]*);/)[1];
      }
      return await Promise.all(tags.map(returnTagSize));
    }

    async clickVerticalBarChart() {
      const vertBar = await remote.findElement(By.partialLinkText('Vertical Bar'));
      await vertBar.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickHeatmapChart() {
      await remote.click(By.partialLinkText('Heat Map'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickInputControlVis() {
      await remote.click(By.partialLinkText('Controls'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getChartTypeCount() {
      const tags = await remote.findElements(By.css('a.wizard-vis-type'));
      return tags.length;
    }

    async getChartTypes() {
      const chartTypes = await testSubjects.findAll('visualizeWizardChartTypeTitle');
      async function getChartType(chart) {
        return await chart.getText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async selectVisSourceIfRequired() {
      log.debug('selectVisSourceIfRequired');
      const selectPage = await testSubjects.findAll('visualizeSelectSearch');
      if (selectPage.length) {
        log.debug('a search is required for this visualization');
        await this.clickNewSearch();
      }
    }

    async getLabTypeLinks() {
      return await remote.findElements(By.partialLinkText('(Lab)'));
    }

    async getExperimentalTypeLinks() {
      return await remote.findElements(By.partialLinkText('(Experimental)'));
    }

    async isExperimentalInfoShown() {
      return await testSubjects.exists('experimentalVisInfo');
    }

    async getExperimentalInfo() {
      return await testSubjects.find('experimentalVisInfo');
    }

    async clickAbsoluteButton() {
      await remote.click(
        By.css('ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")'),
        defaultFindTimeout * 2);
    }

    async setMarkdownTxt(markdownTxt) {
      const input = await testSubjects.find('markdownTextarea');
      await input.clearValue();
      await input.sendKeys(markdownTxt);
    }

    async getMarkdownText() {
      const markdownContainer = await testSubjects.find('markdownBody');
      return markdownContainer.getText();
    }

    async getMarkdownBodyDescendentText(selector) {
      const markdownContainer = await testSubjects.find('markdownBody');
      const element = await find.descendantDisplayedByCssSelector(selector, markdownContainer);
      return element.getText();
    }

    async getVegaSpec() {
      // Adapted from console_page.js:getTextFromAceEditor(). Is there a common utilities file?
      const editor = await testSubjects.find('vega-editor');
      const lines = await editor.findElements(By.className('ace_line_group'));
      const linesText = await Bluebird.map(lines, l => l.getText());
      return linesText.join('\n');
    }

    async getVegaViewContainer() {
      return await remote.findElement(By.css('div.vega-view-container'));
    }

    async getVegaControlContainer() {
      return await remote.findElement(By.css('div.vega-controls-container'));
    }

    async setFromTime(timeString) {
      const input = await remote.findElement(By.css('input[ng-model="absolute.from"]', defaultFindTimeout * 2));
      await input.clearValue();
      await input.sendKeys(timeString);
    }

    async setToTime(timeString) {
      const input = await remote.findElement(By.css('input[ng-model="absolute.to"]', defaultFindTimeout * 2));
      await input.clearValue();
      await input.sendKeys(timeString);
    }

    async addInputControl() {
      await testSubjects.click('inputControlEditorAddBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async inputControlSubmit() {
      await testSubjects.click('inputControlSubmitBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async inputControlClear() {
      await testSubjects.click('inputControlClearBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async checkCheckbox(selector) {
      const element = await testSubjects.find(selector);
      const isSelected = await element.isSelected();
      if (!isSelected) {
        log.debug(`checking checkbox ${selector}`);
        await testSubjects.click(selector);
      }
    }

    async uncheckCheckbox(selector) {
      const element = await testSubjects.find(selector);
      const isSelected = await element.isSelected();
      if (isSelected) {
        log.debug(`unchecking checkbox ${selector}`);
        await testSubjects.click(selector);
      }
    }

    async setSelectByOptionText(selectId, optionText) {
      const options = await find.allByCssSelector(`#${selectId} > option`);
      const optionsTextPromises = options.map(async (optionElement) => {
        return await optionElement.getText();
      });
      const optionsText = await Promise.all(optionsTextPromises);

      const optionIndex = optionsText.indexOf(optionText);
      if (optionIndex === -1) {
        throw new Error(`Unable to find option '${optionText}' in select ${selectId}. Available options: ${optionsText.join(',')}`);
      }
      await options[optionIndex].click();
    }

    async isInspectorButtonEnabled() {
      const button = await testSubjects.find('openInspectorButton');
      const ariaDisabled = await button.getAttribute('aria-disabled');
      return ariaDisabled !== 'true';
    }

    async getSideEditorExists() {
      return await find.existsByCssSelector('.collapsible-sidebar');
    }

    async openInspector() {
      log.debug('Open Inspector');
      const isOpen = await testSubjects.exists('inspectorPanel');
      if (!isOpen) {
        await retry.try(async () => {
          await testSubjects.click('openInspectorButton');
          await testSubjects.find('inspectorPanel');
        });
      }
    }

    async closeInspector() {
      log.debug('Close Inspector');
      let isOpen = await testSubjects.exists('inspectorPanel');
      if (isOpen) {
        await retry.try(async () => {
          await flyout.close('inspectorPanel');
          isOpen = await testSubjects.exists('inspectorPanel');
          if (isOpen) {
            throw new Error('Failed to close inspector');
          }
        });
      }
    }

    async setInspectorTablePageSize(size) {
      const panel = await testSubjects.find('inspectorPanel');
      await find.clickByButtonText('Rows per page: 20', panel);
      // The buttons for setting table page size are in a popover element. This popover
      // element appears as if it's part of the inspectorPanel but it's really attached
      // to the body element by a portal.
      const tableSizesPopover = await remote.findElement(By.css('.euiPanel'));
      await find.clickByButtonText(`${size} rows`, tableSizesPopover);
    }

    async getMetric() {
      const metricElement = await remote.findElement(By.css('div[ng-controller="KbnMetricVisController"]'));
      return await metricElement.getText();
    }

    async getGaugeValue() {
      const elements = await find.allByCssSelector('[data-test-subj="visualizationLoader"] .chart svg');
      return await Promise.all(elements.map(async element => await element.getText()));
    }

    async clickMetricEditor() {
      await remote.click(By.css('button[data-test-subj="toggleEditor"]'));
    }

    async clickNewSearch(indexPattern = this.index.LOGSTASH_TIME_BASED) {
      await testSubjects.click(`paginatedListItem-${indexPattern}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSavedSearch(savedSearchName) {
      await remote.click(By.partialLinkText(savedSearchName));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickUnlinkSavedSearch() {
      await testSubjects.doubleClick('unlinkSavedSearch');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setValue(newValue) {
      await remote.click(By.css('button[ng-click="numberListCntr.add()"]'), defaultFindTimeout * 2);
      const input = await remote.findElement(By.css('input[ng-model="numberListCntr.getList())[$index]"]'));
      await input.clearValue();
      await input.sendKeys(newValue);
    }

    async selectSearch(searchName) {
      await find.clickByLinkText(searchName);
    }

    async getErrorMessage() {
      const element = await remote.findElement(By.css('.item>h4'));
      return await element.getText();
    }

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    async clickBucket(bucketName) {
      await retry.try(async () => {
        await remote.click(By.css(`[data-test-subj="${bucketName}"]`));
      });
    }

    async selectAggregation(aggName, groupName = 'buckets', childAggregationType = null) {
      const selector = `
        [group-name="${groupName}"]
        vis-editor-agg-params:not(.ng-hide)
        ${childAggregationType ? `vis-editor-agg-params[group-name="'${childAggregationType}'"]:not(.ng-hide)` : ''}
        .agg-select
      `;

      await retry.try(async () => {
        await remote.click(By.css(selector));
        await remote.click(By.css(`[data-test-subj="${aggName}"]`));
      });
      await PageObjects.common.sleep(500);
    }

    async toggleOpenEditor(index, toState = 'true') {
      // index, see selectYAxisAggregation
      const toggle = await remote.findElement(By.css(`button[aria-controls="visAggEditorParams${index}"]`));
      const toggleOpen = await toggle.getAttribute('aria-expanded');
      log.debug(`toggle ${index} expand = ${toggleOpen}`);
      if (toggleOpen !== toState) {
        log.debug(`toggle ${index} click()`);
        await toggle.click();
      }
    }

    async selectYAxisAggregation(agg, field, label, index = 1) {
      // index starts on the first "count" metric at 1
      // Each new metric or aggregation added to a visualization gets the next index.
      // So to modify a metric or aggregation tests need to keep track of the
      // order they are added.
      await this.toggleOpenEditor(index);
      const aggSelect = await remote
        .findElement(By.css(
          `#visAggEditorParams${index} div [data-test-subj="visEditorAggSelect"] div span[aria-label="Select box activate"]`));
      // open agg selection list
      await aggSelect.click();
      // select our agg
      const aggItem = await remote.findElement(By.css(`[data-test-subj="${agg}"]`));
      await aggItem.click();
      const fieldSelect = await remote
        .findElement(By.css(`#visAggEditorParams${index} > [agg-param="agg.type.params[0]"] > div > div > div.ui-select-match > span`));
      // open field selection list
      await fieldSelect.click();
      // select our field
      await testSubjects.click(field);
      // enter custom label
      await this.setCustomLabel(label, index);
    }

    async setCustomLabel(label, index = 1) {
      const customLabel = await remote.findElement(By.css(`#visEditorStringInput${index}customLabel`));
      customLabel.sendKeys(label);
    }

    async setAxisExtents(min, max, axis = 'LeftAxis-1') {
      const axisOptions = await remote.findElement(By.css(`div[aria-label="Toggle ${axis} options"]`));
      const isOpen = await axisOptions.getAttribute('aria-expanded');
      if (isOpen === 'false') {
        log.debug(`click to open ${axis} options`);
        await axisOptions.click();
      }
      // it would be nice to get the correct axis by name like "LeftAxis-1"
      // instead of an incremented index, but this link isn't under the div above
      const advancedLink =
        await remote.findElement(By.css(`#axisOptionsValueAxis-1 .kuiSideBarOptionsLink .kuiSideBarOptionsLink__caret`));

      const advancedLinkState = await advancedLink.getAttribute('class');
      if (advancedLinkState.includes('fa-caret-right')) {
        log.debug('click advancedLink');
        await advancedLink.click();
      }
      const checkbox = await remote.findElement(By.css('input[ng-model="axis.scale.setYExtents"]'));
      const checkboxState = await checkbox.getAttribute('class');
      if (checkboxState.includes('ng-empty')) {
        await checkbox.click();
      }
      const maxField = await remote.findElement(By.css('[ng-model="axis.scale.max"]'));
      await maxField.sendKeys(max);
      const minField = await remote.findElement(By.css('[ng-model="axis.scale.min"]'));
      await minField.sendKeys(min);

    }

    async getField() {
      const field = await retry.try(
        async () => await remote.findElement(By.css('.ng-valid-required[name="field"] .ui-select-match-text')));
      return await field.getText();
    }

    async selectField(fieldValue, groupName = 'buckets', childAggregationType = null) {
      const selector = `
        [group-name="${groupName}"]
        vis-editor-agg-params:not(.ng-hide)
        ${childAggregationType ? `vis-editor-agg-params[group-name="'${childAggregationType}'"]:not(.ng-hide)` : ''}
        .field-select
      `;

      await retry.try(async () => {
        await remote.click(By.css(selector));
        await remote.click(By.css(`[data-test-subj="${fieldValue}"]`));
      });
      await PageObjects.common.sleep(500);
    }

    async selectFieldById(fieldValue, id) {
      await remote.click(By.css(`#${id} > option[label="${fieldValue}"]`));
    }

    async orderBy(fieldValue) {
      await remote.click(By.css(
        'select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"]'
        + `option:contains("${fieldValue}")`));
    }

    async selectOrderBy(fieldValue) {
      await remote.click(By.css(`select[name="orderBy"] > option[value="${fieldValue}"]`));
    }

    async getInputTypeParam(paramName) {
      const input = await remote.findElement(By.css(`input[ng-model="agg.params.${paramName}"]`));
      return await input.getProperty('value');
    }

    async getInterval() {
      const select = await remote.findElement(By.css('select[ng-model="agg.params.interval"]'));
      const selectedIndex = await select.getProperty('selectedIndex');
      const intervalElement = await find.byCssSelector(
        `select[ng-model="agg.params.interval"] option:nth-child(${(selectedIndex + 1)})`);
      return await intervalElement.getProperty('label');
    }

    async setInterval(newValue) {
      const input = await remote.findElement(By.css('select[ng-model="agg.params.interval"]'));
      await input.sendKeys(newValue);
    }

    async setNumericInterval(newValue, { append } = {}) {
      const input = await remote.findElement(By.css('input[name="interval"]'));
      if (!append) {
        await input.clearValue();
      }
      // await input.type(newValue + '');
      // await remote.type(input, newValue + '');
      await find.setValueElement(input, newValue);
      await PageObjects.common.sleep(1000);
    }

    async setSize(newValue) {
      const input = await remote.findElement(By.css('input[name="size"]'));
      await input.clearValue();
      await input.sendKeys(newValue);
    }

    async toggleDisabledAgg(agg) {
      await testSubjects.click(`aggregationEditor${agg} disableAggregationBtn`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async toggleOtherBucket() {
      return await remote.click(By.css('input[name="showOther"]'));
    }

    async toggleMissingBucket() {
      return await remote.click(By.css('input[name="showMissing"]'));
    }

    async isApplyEnabled() {
      const applyButton = await testSubjects.find('visualizeEditorRenderButton');
      return await applyButton.isEnabled();
    }

    async clickGo() {
      await testSubjects.click('visualizeEditorRenderButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // For some reason there are two `data-render-complete` tags on each visualization in the visualize page.
      const countOfDataCompleteFlags = 2;
      await renderable.waitForRender(countOfDataCompleteFlags);
    }

    async clickReset() {
      await testSubjects.click('visualizeEditorResetButton');
    }

    async toggleAutoMode() {
      await testSubjects.click('visualizeEditorAutoButton');
    }

    async sizeUpEditor() {
      await testSubjects.click('visualizeEditorResizer');
      await remote.pressKeys(Keys.ARROW_RIGHT);
    }

    async clickOptions() {
      await remote.click(By.partialLinkText('Options'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }


    async changeHeatmapColorNumbers(value = 6) {
      const input = await testSubjects.find(`heatmapOptionsColorsNumberInput`);
      await input.clearValue();
      await input.sendKeys(`${value}`);
    }

    async clickMetricsAndAxes() {
      await testSubjects.click('visEditorTabadvanced');
    }

    async clickOptionsTab() {
      await testSubjects.click('visEditorTaboptions');
    }

    async clickEnableCustomRanges() {
      await testSubjects.click('heatmapEnableCustomRanges');
    }

    async clickAddRange() {
      await testSubjects.click(`heatmapAddRangeButton`);
    }

    async isCustomRangeTableShown() {
      await testSubjects.exists('heatmapCustomRangesTable');
    }

    async addCustomRange(from, to) {
      const table = await testSubjects.find('heatmapCustomRangesTable');
      const lastRow = await table.findByCssSelector('tr:last-child');
      const fromCell = await lastRow.findByCssSelector('td:first-child input');
      fromCell.clearValue();
      fromCell.sendKeys(`${from}`);
      const toCell = await lastRow.findByCssSelector('td:nth-child(2) input');
      toCell.clearValue();
      toCell.sendKeys(`${to}`);
    }
    async clickYAxisOptions(axisId) {
      await testSubjects.click(`toggleYAxisOptions-${axisId}`);
    }

    async clickYAxisAdvancedOptions(axisId) {
      await testSubjects.click(`toggleYAxisAdvancedOptions-${axisId}`);
    }

    async changeYAxisFilterLabelsCheckbox(axisId, enabled) {
      const selector = `yAxisFilterLabelsCheckbox-${axisId}`;
      enabled ? await this.checkCheckbox(selector) : await this.uncheckCheckbox(selector);
    }

    async selectChartMode(mode) {
      const selector = await remote.findElement(By.css(`#seriesMode0 > option[label="${mode}"]`));
      await selector.click();
    }

    async selectYAxisScaleType(axisId, scaleType) {
      const selectElement = await testSubjects.find(`scaleSelectYAxis-${axisId}`);
      const selector = await selectElement.findElement(By.css(`option[label="${scaleType}"]`));
      await selector.click();
    }

    async clickData() {
      await testSubjects.click('visualizeEditDataLink');
    }

    async clickVisEditorTab(tabName) {
      await testSubjects.click('visEditorTab' + tabName);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async selectWMS() {
      await remote.findElement(By.css('input[name="wms.enabled"]'));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async ensureSavePanelOpen() {
      log.debug('ensureSavePanelOpen');
      let isOpen = await testSubjects.exists('savedObjectSaveModal');
      await retry.try(async () => {
        while (!isOpen) {
          await testSubjects.click('visualizeSaveButton');
          isOpen = await testSubjects.exists('savedObjectSaveModal');
        }
      });
    }

    async saveVisualization(vizName, { saveAsNew = false } = {}) {
      await this.ensureSavePanelOpen();
      await testSubjects.setValue('savedObjectTitle', vizName);
      if (saveAsNew) {
        log.debug('Check save as new visualization');
        await testSubjects.click('saveAsNewCheckbox');
      }
      log.debug('Click Save Visualization button');
      await testSubjects.click('confirmSaveSavedObjectButton');
    }

    async saveVisualizationExpectSuccess(vizName, { saveAsNew = false } = {}) {
      await this.saveVisualization(vizName, { saveAsNew });
      const successToast = await testSubjects.exists('saveVisualizationSuccess', defaultFindTimeout);
      expect(successToast).to.be(true);
    }

    async saveVisualizationExpectFail(vizName, { saveAsNew = false } = {}) {
      await this.saveVisualization(vizName, { saveAsNew });
      const errorToast = await testSubjects.exists('saveVisualizationError', defaultFindTimeout);
      expect(errorToast).to.be(true);
    }

    async clickLoadSavedVisButton() {
      // TODO: Use a test subject selector once we rewrite breadcrumbs to accept each breadcrumb
      // element as a child instead of building the breadcrumbs dynamically.
      await remote.click(By.css('[href="#/visualize"]'));
    }

    async filterVisByName(vizName) {
      const input = await remote.findElement(By.css('input[name="filter"]'));
      await input.click();
      // can't uses dashes in saved visualizations when filtering
      // or extended character sets
      // https://github.com/elastic/kibana/issues/6300
      await input.sendKeys(vizName.replace('-', ' '));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVisualizationByName(vizName) {
      log.debug('clickVisualizationByLinkText(' + vizName + ')');

      return retry.try(function tryingForTime() {
        return remote
          .findElement(By.partialLinkText(vizName), defaultFindTimeout)
          .click();
      });
    }

    // this starts by clicking the Load Saved Viz button, not from the
    // bottom half of the "Create a new visualization      Step 1" page
    async loadSavedVisualization(vizName) {
      await this.clickLoadSavedVisButton();
      await this.openSavedVisualization(vizName);
    }

    async openSavedVisualization(vizName) {
      await this.clickVisualizationByName(vizName);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getXAxisLabels() {
      const chartTypes = await find.allByCssSelector('.x > g');
      async function getChartType(chart) {
        return await chart.getText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async getYAxisLabels() {
      const chartTypes = await find.allByCssSelector('.y > g');
      const getChartTypesPromises = chartTypes.map(async chart => await chart.getText());
      return await Promise.all(getChartTypesPromises);
    }

    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    async getAreaChartData(dataLabel, axis = 'ValueAxis-1') {
      const yAxisRatio = await this.getChartYAxisRatio(axis);

      const rectangle = await remote.findElement(By.css('rect.background'));
      const yAxisHeight = await rectangle.getAttribute('height');
      log.debug(`height --------- ${yAxisHeight}`);

      const path = await retry.try(
        async () => await remote.findElement(By.css(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2)));
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      const tempArray = data.replace('M', '').split('L');
      const chartSections = tempArray.length / 2;
      // log.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
      const chartData = [];
      for (let i = 0; i < chartSections; i++) {
        chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) * yAxisRatio);
        log.debug('chartData[i] =' + chartData[i]);
      }
      return chartData;
    }

    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    async getLineChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 2). find and save the y-axis pixel size (the chart height)
      const rectangle = await remote.findElement(By.css('clipPath rect'));
      const yAxisHeight = await rectangle.getAttribute('height');
      // 3). get the chart-wrapper elements
      const chartTypes = await retry.try(
        async () => await remote
          .findElements(By.css(`.chart-wrapper circle[data-label="${dataLabel}"][fill-opacity="1"]`), defaultFindTimeout * 2));

      // 5). for each chart element, find the green circle, then the cy position
      async function getChartType(chart) {
        const cy = await chart.getAttribute('cy');
        // the point_series_options test has data in the billions range and
        // getting 11 digits of precision with these calculations is very hard
        return Math.round(((yAxisHeight - cy) * yAxisRatio).toPrecision(6));
      }

      // 4). pass the chartTypes to the getChartType function
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    // this is ALMOST identical to DiscoverPage.getBarChartData
    async getBarChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 3). get the chart-wrapper elements
      const chartTypes = await remote.findElements(By.css(`svg > g > g.series > rect[data-label="${dataLabel}"]`));

      async function getChartType(chart) {
        const barHeight = await chart.getAttribute('height');
        return Math.round(barHeight * yAxisRatio);
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }


    // Returns value per pixel
    async getChartYAxisRatio(axis = 'ValueAxis-1') {
      // 1). get the maximum chart Y-Axis marker value and Y position
      const maxYAxisChartMarker = await retry.try(
        async () => await remote.findElement(By.css(`div.y-axis-div-wrapper > div > svg > g.${axis} > g:last-of-type.tick`))
      );
      const maxYLabel = (await maxYAxisChartMarker.getText()).replace(/,/g, '');
      const maxYLabelYPosition = (await maxYAxisChartMarker.getRect()).y;
      log.debug(`maxYLabel = ${maxYLabel}, maxYLabelYPosition = ${maxYLabelYPosition}`);

      // 2). get the minimum chart Y-Axis marker value and Y position
      const minYAxisChartMarker = await
      remote.findElement(By.css(
        'div.y-axis-col.axis-wrapper-left  > div > div > svg:nth-child(2) > g > g:nth-child(1).tick'));
      const minYLabel = (await minYAxisChartMarker.getText()).replace(',', '');
      const minYLabelYPosition = (await minYAxisChartMarker.getRect()).y;
      return ((maxYLabel - minYLabel) / (minYLabelYPosition - maxYLabelYPosition));
    }


    async getHeatmapData() {
      const chartTypes = await retry.try(
        async () => await remote.findElements(By.css('svg > g > g.series rect'), defaultFindTimeout * 2));
      log.debug('rects=' + chartTypes);
      async function getChartType(chart) {
        return await chart.getAttribute('data-label');
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async getPieChartData() {
      const chartTypes = await remote.findElements(By.css('path.slice'), defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('d'));
      return await Promise.all(getChartTypesPromises);
    }

    async getPieChartLabels() {
      const chartTypes = await remote.findElements(By.css('path.slice'), defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('data-label'));
      return await Promise.all(getChartTypesPromises);
    }

    async getChartAreaWidth() {
      const rect = await retry.try(async () => remote.findElement(By.css('clipPath rect')));
      return await rect.getAttribute('width');
    }

    async getChartAreaHeight() {
      const rect = await retry.try(async () => remote.findElement(By.css('clipPath rect')));
      return await rect.getAttribute('height');
    }

    async getTableVisData() {
      const dataTable = await testSubjects.find('paginated-table-body');
      return await dataTable.getText();
    }

    async getInspectorTableData() {
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const inspectorPanel = await testSubjects.find('inspectorPanel');
      const tableBody = await retry.try(async () => inspectorPanel.findElement(By.css('tbody')));
      // Convert the data into a nested array format:
      // [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
      const rows = await tableBody.findElements(By.tagName('tr'));
      return await Promise.all(rows.map(async row => {
        const cells = await row.findElements(By.tagName('td'));
        return await Promise.all(cells.map(async cell => cell.getText()));
      }));
    }

    async getInspectorTableHeaders() {
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const dataTableHeader = await retry.try(async () => {
        const inspectorPanel = await testSubjects.find('inspectorPanel');
        return await inspectorPanel.findElements(By.tagName('thead'));
      });
      const cells = await dataTableHeader.findElements(By.tagName('th'));
      return await Promise.all(cells.map(async (cell) => {
        const untrimmed = await cell.getText();
        return untrimmed.trim();
      }));
    }

    async toggleIsFilteredByCollarCheckbox() {
      await testSubjects.click('isFilteredByCollarCheckbox');
    }

    async getMarkdownData() {
      const markdown = await retry.try(async () => remote.findElement(By.css('visualize')));
      return await markdown.getText();
    }

    async clickColumns() {
      await remote.findElements(By.css('div.schemaEditors > div > div > button:nth-child(2)'));
    }

    async waitForVisualization() {
      return await remote.findElement(By.css('.visualization'));
    }

    async waitForVisualizationSavedToastGone() {
      return await testSubjects.waitForDeleted('saveVisualizationSuccess');
    }

    async getZoomSelectors(zoomSelector) {
      return await remote.findElements(By.css(zoomSelector));
    }

    async clickMapButton(zoomSelector) {
      await retry.try(async () => {
        const zooms = await this.getZoomSelectors(zoomSelector);
        await Promise.all(zooms.map(async zoom => await zoom.click()));
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
    }

    async getVisualizationRequest() {
      log.debug('getVisualizationRequest');
      await this.openInspector();
      await testSubjects.click('inspectorViewChooser');
      await testSubjects.click('inspectorViewChooserRequests');
      await testSubjects.click('inspectorRequestDetailRequest');
      return await testSubjects.getVisibleText('inspectorRequestBody');
    }

    async getVisualizationResponse() {
      log.debug('getVisualizationResponse');
      await this.openInspector();
      await testSubjects.click('inspectorViewChooser');
      await testSubjects.click('inspectorViewChooserRequests');
      await testSubjects.click('inspectorRequestDetailResponse');
      return await testSubjects.getVisibleText('inspectorResponseBody');
    }

    async getMapBounds() {
      const request = await this.getVisualizationRequest();
      const requestObject = JSON.parse(request);
      return requestObject.aggs.filter_agg.filter.geo_bounding_box['geo.coordinates'];
    }

    async clickMapZoomIn() {
      await this.clickMapButton('a.leaflet-control-zoom-in');
    }

    async clickMapZoomOut() {
      await this.clickMapButton('a.leaflet-control-zoom-out');
    }

    async getMapZoomEnabled(zoomSelector) {
      const zooms = await this.getZoomSelectors(zoomSelector);
      const classAttributes = await Promise.all(zooms.map(async zoom => await zoom.getAttribute('class')));
      return !classAttributes.join('').includes('leaflet-disabled');
    }

    async zoomAllTheWayOut() {
      // we can tell we're at level 1 because zoom out is disabled
      return await retry.try(async () => {
        await this.clickMapZoomOut();
        const enabled = await this.getMapZoomOutEnabled();
        //should be able to zoom more as current config has 0 as min level.
        if (enabled) {
          throw new Error('Not fully zoomed out yet');
        }
      });
    }

    async getMapZoomInEnabled() {
      return await this.getMapZoomEnabled('a.leaflet-control-zoom-in');
    }

    async getMapZoomOutEnabled() {
      return await this.getMapZoomEnabled('a.leaflet-control-zoom-out');
    }

    async clickMapFitDataBounds() {
      return await this.clickMapButton('a.fa-crop');
    }

    async clickLandingPageBreadcrumbLink() {
      log.debug('clickLandingPageBreadcrumbLink');
      await remote.findElement(By.css(`a[href="#${VisualizeConstants.LANDING_PAGE_PATH}"]`));
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

    async getLegendEntries() {
      const legendEntries = await remote.findElements(By.css('.legend-value-title'), defaultFindTimeout * 2);
      return await Promise.all(legendEntries.map(async chart => await chart.getAttribute('data-label')));
    }

    async openLegendOptionColors(name) {
      await retry.try(async () => {
        // This click has been flaky in opening the legend, hence the retry.  See
        // https://github.com/elastic/kibana/issues/17468
        await testSubjects.click(`legend-${name}`);
        // arbitrary color chosen, any available would do
        const isOpen = await this.doesLegendColorChoiceExist('#EF843C');
        if (!isOpen) {
          throw new Error('legend color selector not open');
        }
      });
    }

    async filterOnTableCell(column, row) {
      const table = await testSubjects.find('tableVis');
      const cell = await table.findElement(By.css(`tbody tr:nth-child(${row}) td:nth-child(${column})`));
      await remote.moveMouseTo(cell);
      const filterBtn = await testSubjects.findDescendant('filterForCellValue', cell);
      await filterBtn.click();
    }

    async doesLegendColorChoiceExist(color) {
      return await testSubjects.exists(`legendSelectColor-${color}`);
    }

    async selectNewLegendColorChoice(color) {
      await testSubjects.click(`legendSelectColor-${color}`);
    }

    async doesSelectedLegendColorExist(color) {
      return await testSubjects.exists(`legendSelectedColor-${color}`);
    }

    async getYAxisTitle() {
      const title = await remote.findElement(By.css('.y-axis-div .y-axis-title text'));
      return await title.getText();
    }

    async selectBucketType(type) {
      const bucketType = await remote.findElement(By.css(`[data-test-subj="${type}"]`));
      return await bucketType.click();
    }

    async getPieSlice(name) {
      return await testSubjects.find(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getAllPieSlices(name) {
      return await testSubjects.findAll(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getPieSliceStyle(name) {
      log.debug(`VisualizePage.getPieSliceStyle(${name})`);
      const pieSlice = await this.getPieSlice(name);
      return await pieSlice.getAttribute('style');
    }

    async getAllPieSliceStyles(name) {
      log.debug(`VisualizePage.getAllPieSliceStyles(${name})`);
      const pieSlices = await this.getAllPieSlices(name);
      return await Promise.all(pieSlices.map(async pieSlice => await pieSlice.getAttribute('style')));
    }

    async getBucketErrorMessage() {
      const error = await remote.findElement(By.css('.vis-editor-agg-error'));
      const errorMessage = await error.getProperty('innerText');
      log.debug(errorMessage);
      return errorMessage;
    }

    async selectSortMetric(agg, metric) {
      const sortMetric = await remote.findElement(By.css(`[data-test-subj="visEditorOrder${agg}-${metric}"]`));
      return await sortMetric.click();
    }

    async selectCustomSortMetric(agg, metric, field) {
      await this.selectSortMetric(agg, 'custom');
      await this.selectAggregation(metric, 'groupName');
      await this.selectField(field, 'groupName');
    }
  }

  return new VisualizePage();
}
