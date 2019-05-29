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

import { FtrProviderContext } from '../ftr_provider_context.d';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export function VisualBuilderPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['common', 'header', 'visualize', 'timePicker']);

  class VisualBuilderPage {
    public async resetPage(
      fromTime = '2015-09-19 06:31:44.000',
      toTime = '2015-09-22 18:31:44.000'
    ) {
      await PageObjects.common.navigateToUrl('visualize', 'create?type=metrics');
      log.debug('Set absolute time range from "' + fromTime + '" to "' + toTime + '"');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    }

    public async checkTabIsLoaded(testSubj: string, name: string) {
      const isPresent = await testSubjects.exists(testSubj, { timeout: 5000 });
      if (!isPresent) {
        throw new Error(`TSVB ${name} tab is not loaded`);
      }
    }

    public async checkVisualBuilderIsPresent() {
      await this.checkTabIsLoaded('tvbVisEditor', 'Time Series');
    }

    public async checkTimeSeriesChartIsPresent() {
      await testSubjects.existOrFail('timeseriesChart');
    }

    public async checkTimeSeriesLegendIsPresent() {
      const isPresent = await find.existsByCssSelector('.tvbLegend');
      if (!isPresent) {
        throw new Error(`TimeSeries legend is not loaded`);
      }
    }

    public async checkMetricTabIsPresent() {
      await this.checkTabIsLoaded('tsvbMetricValue', 'Metric');
    }

    public async checkGaugeTabIsPresent() {
      await this.checkTabIsLoaded('tvbVisGaugeContainer', 'Gauge');
    }

    public async checkTopNTabIsPresent() {
      await this.checkTabIsLoaded('tvbVisTopNTable', 'TopN');
    }

    public async clickMetric() {
      const button = await testSubjects.find('metricTsvbTypeBtn');
      await button.click();
    }

    public async clickMarkdown() {
      const button = await testSubjects.find('markdownTsvbTypeBtn');
      await button.click();
    }

    public async getMetricValue() {
      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
      const metricValue = await find.byCssSelector('.tvbVisMetric__value--primary');
      return metricValue.getVisibleText();
    }

    public async enterMarkdown(markdown: string) {
      const input = await find.byCssSelector('.tvbMarkdownEditor__editor textarea');
      await this.clearMarkdown();
      await input.type(markdown);
      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
    }

    public async clearMarkdown() {
      const input = await find.byCssSelector('.tvbMarkdownEditor__editor textarea');
      // click for switching context(fix for "should render first table variable" test)
      // see _tsvb_markdown.js
      // Since we use ACE editor and that isn't really storing its value inside
      // a textarea we must really select all text and remove it, and cannot use
      // clearValue().
      await input.clearValueWithKeyboard();
    }

    public async getMarkdownText(): Promise<string> {
      const el = await find.byCssSelector('.tvbEditorVisualization');
      const text = await el.getVisibleText();
      return text;
    }

    /**
     *
     * getting all markdown variables list which located on `table` section
     *
     * **Note**: if `table` not have variables, use `getMarkdownTableNoVariables` method instead
     * @see {getMarkdownTableNoVariables}
     * @returns {Promise<Array<{key:string, value:string, selector:any}>>}
     * @memberof VisualBuilderPage
     */
    public async getMarkdownTableVariables(): Promise<
      Array<{ key: string; value: string; selector: WebElementWrapper }>
    > {
      const testTableVariables = await testSubjects.find('tsvbMarkdownVariablesTable');
      const variablesSelector = 'tbody tr';
      const exists = await find.existsByCssSelector(variablesSelector);
      if (!exists) {
        log.debug('variable list is empty');
        return [];
      }
      const variables = await testTableVariables.findAllByCssSelector(variablesSelector);

      const variablesKeyValueSelectorMap = await Promise.all(
        variables.map(async variable => {
          const subVars = await variable.findAllByCssSelector('td');
          const selector = await subVars[0].findByTagName('a');
          const key = await selector.getVisibleText();
          const value = await subVars[1].getVisibleText();
          log.debug(`markdown table variables table is: ${key} ${value}`);
          return { key, value, selector };
        })
      );
      return variablesKeyValueSelectorMap;
    }

    /**
     * return variable table message, if `table` is empty it will be fail
     *
     * **Note:** if `table` have variables, use `getMarkdownTableVariables` method instead
     * @see {@link VisualBuilderPage#getMarkdownTableVariables}
     * @returns
     * @memberof VisualBuilderPage
     */
    public async getMarkdownTableNoVariables() {
      return await testSubjects.getVisibleText('tvbMarkdownEditor__noVariables');
    }

    /**
     * get all sub-tabs count for `time series`, `metric`, `top n`, `gauge`, `markdown` or `table` tab.
     *
     * @returns {Promise<any[]>}
     * @memberof VisualBuilderPage
     */
    public async getSubTabs(): Promise<WebElementWrapper[]> {
      return await find.allByCssSelector('[data-test-subj$="-subtab"]');
    }

    /**
     * switch markdown sub-tab for visualization
     *
     * @param {'data' | 'options'| 'markdown'} subTab
     * @memberof VisualBuilderPage
     */
    public async markdownSwitchSubTab(subTab: 'data' | 'options' | 'markdown') {
      const element = await testSubjects.find(`${subTab}-subtab`);
      await element.click();
    }

    /**
     * setting label for markdown visualization
     *
     * @param {string} variableName
     * @param type
     * @memberof VisualBuilderPage
     */
    public async setMarkdownDataVariable(variableName: string, type: 'variable' | 'label') {
      const SELECTOR = type === 'label' ? '[placeholder="Label"]' : '[placeholder="Variable name"]';
      if (variableName) {
        await find.setValue(SELECTOR, variableName);
      } else {
        const input = await find.byCssSelector(SELECTOR);
        await input.clearValueWithKeyboard({ charByChar: true });
      }
    }

    public async clickSeriesOption(nth = 0) {
      const el = await testSubjects.findAll('seriesOptions');
      await el[nth].click();
    }

    public async clearOffsetSeries() {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
    }

    public async toggleAutoApplyChanges() {
      await find.clickByCssSelector('#tsvbAutoApplyInput');
    }

    public async applyChanges() {
      await testSubjects.clickWhenNotDisabled('applyBtn');
    }

    /**
     * write template for aggregation row in the `option` tab
     *
     * @param template always should contain `{{value}}`
     * @example
     * await visualBuilder.enterSeriesTemplate('$ {{value}}') // add `$` symbol for value
     */
    public async enterSeriesTemplate(template: string) {
      const el = await testSubjects.find('tsvb_series_value');
      await el.clearValueWithKeyboard();
      await el.type(template);
    }

    public async enterOffsetSeries(value: string) {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await el.type(value);
    }

    public async getRhythmChartLegendValue() {
      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
      const metricValue = await find.byCssSelector('.tvbLegend__itemValue');
      await metricValue.moveMouseTo();
      return await metricValue.getVisibleText();
    }

    public async clickGauge() {
      await testSubjects.click('gaugeTsvbTypeBtn');
    }

    public async getGaugeLabel() {
      const gaugeLabel = await find.byCssSelector('.tvbVisGauge__label');
      return await gaugeLabel.getVisibleText();
    }

    public async getGaugeCount() {
      const gaugeCount = await find.byCssSelector('.tvbVisGauge__value');
      return await gaugeCount.getVisibleText();
    }

    public async clickTopN() {
      await testSubjects.click('top_nTsvbTypeBtn');
    }

    public async getTopNLabel() {
      const topNLabel = await find.byCssSelector('.tvbVisTopN__label');
      return await topNLabel.getVisibleText();
    }

    public async getTopNCount() {
      const gaugeCount = await find.byCssSelector('.tvbVisTopN__value');
      return await gaugeCount.getVisibleText();
    }

    public async clickTable() {
      await testSubjects.click('tableTsvbTypeBtn');
    }

    public async createNewAgg(nth = 0) {
      return await retry.try(async () => {
        const elements = await testSubjects.findAll('addMetricAddBtn');
        await elements[nth].click();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const aggs = await testSubjects.findAll('aggSelector');
        if (aggs.length < 2) {
          throw new Error('there should be atleast 2 aggSelectors');
        }
      });
    }

    public async selectAggType(value: string, nth = 0) {
      const elements = await testSubjects.findAll('aggSelector');
      await comboBox.setElement(elements[nth], value);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async fillInExpression(expression: string, nth = 0) {
      const expressions = await testSubjects.findAll('mathExpression');
      await expressions[nth].type(expression);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async fillInVariable(name = 'test', metric = 'Count', nth = 0) {
      const elements = await testSubjects.findAll('varRow');
      const varNameInput = await elements[nth].findByCssSelector('.tvbAggs__varName');
      await varNameInput.type(name);
      const metricSelectWrapper = await elements[nth].findByCssSelector(
        '.tvbAggs__varMetricWrapper'
      );
      await comboBox.setElement(metricSelectWrapper, metric);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async selectGroupByField(fieldName: string) {
      await comboBox.set('groupByField', fieldName);
    }

    public async setColumnLabelValue(value: string) {
      const el = await testSubjects.find('columnLabelName');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    /**
     * get values for rendered table
     *
     * **Note:** this work only for table visualization
     *
     * @returns {Promise<string>}
     * @memberof VisualBuilderPage
     */
    public async getViewTable(): Promise<string> {
      const tableView = await testSubjects.find('tableView');
      return await tableView.getVisibleText();
    }

    public async clickMetricPanelOptions() {
      const button = await testSubjects.find('metricEditorPanelOptionsBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async setIndexPatternValue(value: string) {
      const el = await testSubjects.find('metricsIndexPatternInput');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async selectIndexPatternTimeField(timeField: string) {
      const el = await testSubjects.find('comboBoxSearchInput');
      await el.clearValue();
      await el.type(timeField);
      await el.pressKeys(browser.keys.RETURN);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    /**
     * check that table visualization is visible and ready for interact
     *
     * @returns {Promise<void>}
     * @memberof VisualBuilderPage
     */
    public async checkTableTabIsPresent(): Promise<void> {
      await testSubjects.existOrFail('visualizationLoader');
      const isDataExists = await testSubjects.exists('tableView');
      log.debug(`data is already rendered: ${isDataExists}`);
      if (!isDataExists) {
        await this.checkPreviewIsDisabled();
      }
    }

    /**
     * set label name for aggregation
     *
     * @param {string} labelName
     * @param {number} [nth=0]
     * @memberof VisualBuilderPage
     */
    public async setLabel(labelName: string, nth: number = 0): Promise<void> {
      const input = (await find.allByCssSelector('[placeholder="Label"]'))[nth];
      await input.type(labelName);
    }

    /**
     * set field for type of aggregation
     *
     * @param {string} field name of field
     * @param {number} [aggNth=0] number of aggregation. Start by zero
     * @default 0
     * @memberof VisualBuilderPage
     */
    public async setFieldForAggregation(field: string, aggNth: number = 0): Promise<void> {
      const labels = await testSubjects.findAll('aggRow');
      const label = labels[aggNth];
      const fieldEl = (await label.findAllByCssSelector('[data-test-subj = "comboBoxInput"]'))[1];
      await comboBox.setElement(fieldEl, field);
    }

    public async clickColorPicker(): Promise<void> {
      await testSubjects.click('tvbColorPicker');
    }

    public async checkColorPickerPopUpIsPresent(): Promise<void> {
      log.debug(`Check color picker popup is present`);
      await testSubjects.existOrFail('tvbColorPickerPopUp', { timeout: 5000 });
    }

    public async changePanelPreview(nth: number = 0): Promise<void> {
      const prevRenderingCount = await PageObjects.visualize.getVisualizationRenderingCount();
      const changePreviewBtnArray = await testSubjects.findAll('AddActivatePanelBtn');
      await changePreviewBtnArray[nth].click();
      await PageObjects.visualize.waitForRenderingCount(prevRenderingCount + 1);
    }

    public async checkPreviewIsDisabled(): Promise<void> {
      log.debug(`Check no data message is present`);
      await testSubjects.existOrFail('noTSVBDataMessage', { timeout: 5000 });
    }

    public async cloneSeries(nth: number = 0): Promise<void> {
      const prevRenderingCount = await PageObjects.visualize.getVisualizationRenderingCount();
      const cloneBtnArray = await testSubjects.findAll('AddCloneBtn');
      await cloneBtnArray[nth].click();
      await PageObjects.visualize.waitForRenderingCount(prevRenderingCount + 1);
    }

    public async getLegentItems(): Promise<WebElementWrapper[]> {
      return await testSubjects.findAll('tsvbLegendItem');
    }

    public async getSeries(): Promise<WebElementWrapper[]> {
      return await find.allByCssSelector('.tvbSeriesEditor');
    }
  }

  return new VisualBuilderPage();
}
