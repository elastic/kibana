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

    async clickVisType(type) {
      await testSubjects.click(`visType-${type}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickAreaChart() {
      await find.clickByPartialLinkText('Area');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickDataTable() {
      await find.clickByPartialLinkText('Data Table');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickLineChart() {
      await find.clickByPartialLinkText('Line');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickRegionMap() {
      await find.clickByPartialLinkText('Region Map');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMarkdownWidget() {
      await find.clickByPartialLinkText('Markdown');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickAddMetric() {
      await find.clickByCssSelector('[group-name="metrics"] [data-test-subj="visualizeEditorAddAggregationButton"]');
    }

    async clickAddBucket() {
      await find.clickByCssSelector('[group-name="buckets"] [data-test-subj="visualizeEditorAddAggregationButton"]');
    }

    async clickMetric() {
      await find.clickByPartialLinkText('Metric');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickGauge() {
      await find.clickByPartialLinkText('Gauge');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickPieChart() {
      await find.clickByPartialLinkText('Pie');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickTileMap() {
      await find.clickByPartialLinkText('Coordinate Map');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickTagCloud() {
      await find.clickByPartialLinkText('Tag Cloud');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVega() {
      await find.clickByPartialLinkText('Vega');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVisualBuilder() {
      await find.clickByPartialLinkText('Visual Builder');
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
      const elements = await find.allByCssSelector('text');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async getTextSizes() {
      const tags = await find.allByCssSelector('text');
      async function returnTagSize(tag) {
        const style = await tag.getAttribute('style');
        return style.match(/font-size: ([^;]*);/)[1];
      }
      return await Promise.all(tags.map(returnTagSize));
    }

    async clickVerticalBarChart() {
      await find.clickByPartialLinkText('Vertical Bar');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickHeatmapChart() {
      await find.clickByPartialLinkText('Heat Map');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickInputControlVis() {
      await find.clickByPartialLinkText('Controls');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getChartTypeCount() {
      const tags = await find.allByCssSelector('a.wizard-vis-type');
      return tags.length;
    }

    async getChartTypes() {
      const chartTypes = await testSubjects.findAll('visualizeWizardChartTypeTitle');
      async function getChartType(chart) {
        return await chart.getVisibleText();
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
      return await remote.findAllByPartialLinkText('(Lab)');
    }

    async getExperimentalTypeLinks() {
      return await remote.findAllByPartialLinkText('(Experimental)');
    }

    async isExperimentalInfoShown() {
      return await testSubjects.exists('experimentalVisInfo');
    }

    async getExperimentalInfo() {
      return await testSubjects.find('experimentalVisInfo');
    }

    async clickAbsoluteButton() {
      await find.clickByCssSelector(
        'ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")',
        defaultFindTimeout * 2);
    }

    async setMarkdownTxt(markdownTxt) {
      const input = await testSubjects.find('markdownTextarea');
      await input.clearValue();
      await input.type(markdownTxt);
    }

    async getMarkdownText() {
      const markdownContainer = await testSubjects.find('markdownBody');
      return markdownContainer.getVisibleText();
    }

    async getMarkdownBodyDescendentText(selector) {
      const markdownContainer = await testSubjects.find('markdownBody');
      const element = await find.descendantDisplayedByCssSelector(selector, markdownContainer);
      return element.getVisibleText();
    }

    async getVegaSpec() {
      // Adapted from console_page.js:getVisibleTextFromAceEditor(). Is there a common utilities file?
      const editor = await testSubjects.find('vega-editor');
      const lines = await editor.findAllByClassName('ace_line_group');
      const linesText = await Bluebird.map(lines, l => l.getVisibleText());
      return linesText.join('\n');
    }

    async getVegaViewContainer() {
      return await find.byCssSelector('div.vgaVis__view');
    }

    async getVegaControlContainer() {
      return await find.byCssSelector('div.vgaVis__controls');
    }

    async setFromTime(timeString) {
      const input = await find.byCssSelector('input[ng-model="absolute.from"]', defaultFindTimeout * 2);
      await input.clearValue();
      await input.type(timeString);
    }

    async setToTime(timeString) {
      const input = await find.byCssSelector('input[ng-model="absolute.to"]', defaultFindTimeout * 2);
      await input.clearValue();
      await input.type(timeString);
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
      if(!isSelected) {
        log.debug(`checking checkbox ${selector}`);
        await testSubjects.click(selector);
      }
    }

    async uncheckCheckbox(selector) {
      const element = await testSubjects.find(selector);
      const isSelected = await element.isSelected();
      if(isSelected) {
        log.debug(`unchecking checkbox ${selector}`);
        await testSubjects.click(selector);
      }
    }

    async setSelectByOptionText(selectId, optionText) {
      const options = await find.allByCssSelector(`#${selectId} > option`);
      const optionsTextPromises = options.map(async (optionElement) => {
        return await optionElement.getVisibleText();
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
      const tableSizesPopover = await find.byCssSelector('.euiPanel');
      await find.clickByButtonText(`${size} rows`, tableSizesPopover);
    }

    async getMetric() {
      const metricElement = await find.byCssSelector('div[ng-controller="KbnMetricVisController"]');
      return await metricElement.getVisibleText();
    }

    async getGaugeValue() {
      const elements = await find.allByCssSelector('[data-test-subj="visualizationLoader"] .chart svg');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async clickMetricEditor() {
      await find.clickByCssSelector('button[data-test-subj="toggleEditor"]');
    }

    async clickNewSearch(indexPattern = this.index.LOGSTASH_TIME_BASED) {
      await testSubjects.click(`paginatedListItem-${indexPattern}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSavedSearch(savedSearchName) {
      await find.clickByPartialLinkText(savedSearchName);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickUnlinkSavedSearch() {
      await testSubjects.doubleClick('unlinkSavedSearch');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setValue(newValue) {
      await find.clickByCssSelector('button[ng-click="numberListCntr.add()"]', defaultFindTimeout * 2);
      const input = await find.byCssSelector('input[ng-model="numberListCntr.getList()[$index]"]');
      await input.clearValue();
      await input.type(newValue);
    }

    async selectSearch(searchName) {
      await find.clickByLinkText(searchName);
    }

    async getErrorMessage() {
      const element = await find.byCssSelector('.item>h4');
      return await element.getVisibleText();
    }

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    async clickBucket(bucketName, type = 'bucket') {
      const testSubject = type === 'bucket' ? 'bucketsAggGroup' : 'metricsAggGroup';
      await retry.try(async () => {
        const chartTypes = await retry.try(
          async () => await find.allByCssSelector(`[data-test-subj="${testSubject}"] .list-group-menu-item`));
        log.debug('found bucket types ' + chartTypes.length);

        async function getChartType(chart) {
          const chartString = await chart.getVisibleText();
          if (chartString === bucketName) {
            await chart.click();
            return true;
          }
        }
        const getChartTypesPromises = chartTypes.map(getChartType);
        const clickResult = await Promise.all(getChartTypesPromises);
        if (!clickResult.some(result => result === true)) {
          throw new Error(`bucket ${bucketName} not found`);
        }
      });
    }

    async selectAggregation(myString, groupName = 'buckets', childAggregationType = null) {
      const selector = `
        [group-name="${groupName}"]
        vis-editor-agg-params:not(.ng-hide)
        ${childAggregationType ? `vis-editor-agg-params[group-name="'${childAggregationType}'"]:not(.ng-hide)` : ''}
        .agg-select
      `;

      await retry.try(async () => {
        await find.clickByCssSelector(selector);
        const input = await find.byCssSelector(`${selector} input.ui-select-search`);
        await input.type(myString);
        await remote.pressKeys('\uE006');
      });
      await PageObjects.common.sleep(500);
    }

    async toggleOpenEditor(index, toState = 'true') {
      // index, see selectYAxisAggregation
      const toggle = await find.byCssSelector(`button[aria-controls="visAggEditorParams${index}"]`);
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
      const aggSelect = await find
        .byCssSelector(`#visAggEditorParams${index} div [data-test-subj="visEditorAggSelect"] div span[aria-label="Select box activate"]`);
      // open agg selection list
      await aggSelect.click();
      // select our agg
      const aggItem = await find.byCssSelector(`[data-test-subj="${agg}"]`);
      await aggItem.click();
      const fieldSelect = await find
        .byCssSelector(`#visAggEditorParams${index} > [agg-param="agg.type.params[0]"] > div > div > div.ui-select-match > span`);
      // open field selection list
      await fieldSelect.click();
      // select our field
      await testSubjects.click(field);
      // enter custom label
      await this.setCustomLabel(label, index);
    }

    async setCustomLabel(label, index = 1) {
      const customLabel = await find.byCssSelector(`#visEditorStringInput${index}customLabel`);
      customLabel.type(label);
    }

    async setAxisExtents(min, max, axis = 'LeftAxis-1') {
      const axisOptions = await find.byCssSelector(`div[aria-label="Toggle ${axis} options"]`);
      const isOpen = await axisOptions.getAttribute('aria-expanded');
      if (isOpen === 'false') {
        log.debug(`click to open ${axis} options`);
        await axisOptions.click();
      }
      // it would be nice to get the correct axis by name like "LeftAxis-1"
      // instead of an incremented index, but this link isn't under the div above
      const advancedLink =
        await find.byCssSelector(`#axisOptionsValueAxis-1 .kuiSideBarOptionsLink .kuiSideBarOptionsLink__caret`);

      const advancedLinkState = await advancedLink.getAttribute('class');
      if (advancedLinkState.includes('fa-caret-right')) {
        await advancedLink.session.moveMouseTo(advancedLink);
        log.debug('click advancedLink');
        await advancedLink.click();
      }
      const checkbox = await find.byCssSelector('input[ng-model="axis.scale.setYExtents"]');
      const checkboxState = await checkbox.getAttribute('class');
      if (checkboxState.includes('ng-empty')) {
        await checkbox.session.moveMouseTo(checkbox);
        await checkbox.click();
      }
      const maxField = await find.byCssSelector('[ng-model="axis.scale.max"]');
      await maxField.type(max);
      const minField = await find.byCssSelector('[ng-model="axis.scale.min"]');
      await minField.type(min);

    }

    async getField() {
      const field = await retry.try(
        async () => await find.byCssSelector('.ng-valid-required[name="field"] .ui-select-match-text'));
      return await field.getVisibleText();
    }

    async selectField(fieldValue, groupName = 'buckets', childAggregationType = null) {
      const selector = `
        [group-name="${groupName}"]
        vis-editor-agg-params:not(.ng-hide)
        ${childAggregationType ? `vis-editor-agg-params[group-name="'${childAggregationType}'"]:not(.ng-hide)` : ''}
        .field-select
      `;

      await retry.try(async () => {
        await find.clickByCssSelector(selector);
        const input = await find.byCssSelector(`${selector} input.ui-select-search`);
        await input.type(fieldValue);
        await remote.pressKeys('\uE006');
      });
      await PageObjects.common.sleep(500);
    }

    async selectFieldById(fieldValue, id) {
      await find.clickByCssSelector(`#${id} > option[label="${fieldValue}"]`);
    }

    async orderBy(fieldValue) {
      await find.clickByCssSelector(
        'select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"]'
        + `option:contains("${fieldValue}")`);
    }

    async selectOrderBy(fieldValue) {
      await find.clickByCssSelector(`select[name="orderBy"] > option[value="${fieldValue}"]`);
    }

    async getInputTypeParam(paramName) {
      const input = await find.byCssSelector(`input[ng-model="agg.params.${paramName}"]`);
      return await input.getProperty('value');
    }

    async getInterval() {
      const select = await find.byCssSelector('select[ng-model="agg.params.interval"]');
      const selectedIndex = await select.getProperty('selectedIndex');
      const intervalElement = await find.byCssSelector(
        `select[ng-model="agg.params.interval"] option:nth-child(${(selectedIndex + 1)})`);
      return await intervalElement.getProperty('label');
    }

    async setInterval(newValue) {
      const input = await find.byCssSelector('select[ng-model="agg.params.interval"]');
      await input.type(newValue);
      await remote.pressKeys(Keys.RETURN);
    }

    async setCustomInterval(newValue) {
      await this.setInterval('Custom');
      const input = await find.byCssSelector('input[name="customInterval"]');
      await input.clearValue();
      await input.type(newValue);
    }

    async setNumericInterval(newValue, { append } = {}) {
      const input = await find.byCssSelector('input[name="interval"]');
      if (!append) {
        await input.clearValue();
      }
      await input.type(newValue + '');
      await PageObjects.common.sleep(1000);
    }

    async setSize(newValue) {
      const input = await find.byCssSelector('input[name="size"]');
      await input.clearValue();
      await input.type(newValue);
    }

    async toggleDisabledAgg(agg) {
      await testSubjects.click(`aggregationEditor${agg} disableAggregationBtn`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async toggleOtherBucket() {
      return await find.clickByCssSelector('vis-editor-agg-params:not(.ng-hide) input[name="showOther"]');
    }

    async toggleMissingBucket() {
      return await find.clickByCssSelector('vis-editor-agg-params:not(.ng-hide) input[name="showMissing"]');
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
      await find.clickByPartialLinkText('Options');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }


    async changeHeatmapColorNumbers(value = 6) {
      const input = await testSubjects.find(`heatmapOptionsColorsNumberInput`);
      await input.clearValue();
      await input.type(`${value}`);
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
      fromCell.type(`${from}`);
      const toCell = await lastRow.findByCssSelector('td:nth-child(2) input');
      toCell.clearValue();
      toCell.type(`${to}`);
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
      const selector = await find.byCssSelector(`#seriesMode0 > option[label="${mode}"]`);
      await selector.click();
    }

    async selectYAxisScaleType(axisId, scaleType) {
      const selectElement = await testSubjects.find(`scaleSelectYAxis-${axisId}`);
      const selector = await selectElement.findByCssSelector(`option[label="${scaleType}"]`);
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
      await find.clickByCssSelector('input[name="wms.enabled"]');
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
      await find.clickByCssSelector('[href="#/visualize"]');
    }

    async filterVisByName(vizName) {
      const input = await find.byCssSelector('input[name="filter"]');
      await input.click();
      // can't uses dashes in saved visualizations when filtering
      // or extended character sets
      // https://github.com/elastic/kibana/issues/6300
      await input.type(vizName.replace('-', ' '));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVisualizationByName(vizName) {
      log.debug('clickVisualizationByLinkText(' + vizName + ')');

      return retry.try(function tryingForTime() {
        return remote
          .setFindTimeout(defaultFindTimeout)
          .findByPartialLinkText(vizName)
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
        return await chart.getVisibleText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async getYAxisLabels() {
      const chartTypes = await find.allByCssSelector('.y > g');
      const getChartTypesPromises = chartTypes.map(async chart => await chart.getVisibleText());
      return await Promise.all(getChartTypesPromises);
    }

    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    async getAreaChartData(dataLabel, axis = 'ValueAxis-1') {
      const yAxisRatio = await this.getChartYAxisRatio(axis);

      const rectangle = await find.byCssSelector('rect.background');
      const yAxisHeight = await rectangle.getAttribute('height');
      log.debug(`height --------- ${yAxisHeight}`);

      const path = await retry.try(
        async () => await find.byCssSelector(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2));
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
      const rectangle = await find.byCssSelector('clipPath rect');
      const yAxisHeight = await rectangle.getAttribute('height');
      // 3). get the chart-wrapper elements
      const chartTypes = await retry.try(
        async () => await find
          .allByCssSelector(`.chart-wrapper circle[data-label="${dataLabel}"][fill-opacity="1"]`, defaultFindTimeout * 2));

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
      const chartTypes = await find.allByCssSelector(`svg > g > g.series > rect[data-label="${dataLabel}"]`);

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
        async () => await find.byCssSelector(`div.y-axis-div-wrapper > div > svg > g.${axis} > g:last-of-type.tick`)
      );
      const maxYLabel = (await maxYAxisChartMarker.getVisibleText()).replace(/,/g, '');
      const maxYLabelYPosition = (await maxYAxisChartMarker.getPosition()).y;
      log.debug(`maxYLabel = ${maxYLabel}, maxYLabelYPosition = ${maxYLabelYPosition}`);

      // 2). get the minimum chart Y-Axis marker value and Y position
      const minYAxisChartMarker = await find.byCssSelector(
        'div.y-axis-col.axis-wrapper-left  > div > div > svg:nth-child(2) > g > g:nth-child(1).tick'
      );
      const minYLabel = (await minYAxisChartMarker.getVisibleText()).replace(',', '');
      const minYLabelYPosition = (await minYAxisChartMarker.getPosition()).y;
      return ((maxYLabel - minYLabel) / (minYLabelYPosition - maxYLabelYPosition));
    }


    async getHeatmapData() {
      const chartTypes = await retry.try(
        async () => await find.allByCssSelector('svg > g > g.series rect', defaultFindTimeout * 2));
      log.debug('rects=' + chartTypes);
      async function getChartType(chart) {
        return await chart.getAttribute('data-label');
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async getPieChartData() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('d'));
      return await Promise.all(getChartTypesPromises);
    }

    async getPieChartLabels() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('data-label'));
      return await Promise.all(getChartTypesPromises);
    }

    async getChartAreaWidth() {
      const rect = await retry.try(async () => find.byCssSelector('clipPath rect'));
      return await rect.getAttribute('width');
    }

    async getChartAreaHeight() {
      const rect = await retry.try(async () => find.byCssSelector('clipPath rect'));
      return await rect.getAttribute('height');
    }

    async getTableVisData() {
      const dataTable = await testSubjects.find('paginated-table-body');
      return await dataTable.getVisibleText();
    }

    async getInspectorTableData() {
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const inspectorPanel = await testSubjects.find('inspectorPanel');
      const tableBody = await retry.try(async () => inspectorPanel.findByTagName('tbody'));
      // Convert the data into a nested array format:
      // [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
      const rows = await tableBody.findAllByTagName('tr');
      return await Promise.all(rows.map(async row => {
        const cells = await row.findAllByTagName('td');
        return await Promise.all(cells.map(async cell => cell.getVisibleText()));
      }));
    }

    async getInspectorTableHeaders() {
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const dataTableHeader = await retry.try(async () => {
        const inspectorPanel = await testSubjects.find('inspectorPanel');
        return await inspectorPanel.findByTagName('thead');
      });
      const cells = await dataTableHeader.findAllByTagName('th');
      return await Promise.all(cells.map(async (cell) => {
        const untrimmed = await cell.getVisibleText();
        return untrimmed.trim();
      }));
    }

    async toggleIsFilteredByCollarCheckbox() {
      await testSubjects.click('isFilteredByCollarCheckbox');
    }

    async getMarkdownData() {
      const markdown = await retry.try(async () => find.byCssSelector('visualize'));
      return await markdown.getVisibleText();
    }

    async clickColumns() {
      await find.clickByCssSelector('div.schemaEditors > div > div > button:nth-child(2)');
    }

    async waitForVisualization() {
      return await find.byCssSelector('.visualization');
    }

    async waitForVisualizationSavedToastGone() {
      return await testSubjects.waitForDeleted('saveVisualizationSuccess');
    }

    async getZoomSelectors(zoomSelector) {
      return await find.allByCssSelector(zoomSelector);
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

    async getLegendEntries() {
      const legendEntries = await find.allByCssSelector('.legend-value-title', defaultFindTimeout * 2);
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
      const cell = await table.findByCssSelector(`tbody tr:nth-child(${row}) td:nth-child(${column})`);
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
      const title = await find.byCssSelector('.y-axis-div .y-axis-title text');
      return await title.getVisibleText();
    }

    async selectBucketType(type) {
      const bucketType = await find.byCssSelector(`[data-test-subj="${type}"]`);
      return await bucketType.click();
    }

    async filterPieSlice(name) {
      const slice = await this.getPieSlice(name);
      // Since slice is an SVG element we can't simply use .click() for it
      await remote.moveMouseTo(slice);
      await remote.clickMouseButton();
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
      const error = await find.byCssSelector('.visEditorAggParam__error');
      const errorMessage = await error.getProperty('innerText');
      log.debug(errorMessage);
      return errorMessage;
    }

    async selectSortMetric(agg, metric) {
      const sortMetric = await find.byCssSelector(`[data-test-subj="visEditorOrder${agg}-${metric}"]`);
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
