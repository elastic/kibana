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
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVisualBuilderChart');
      await PageObjects.visualize.clickVisualBuilder();
      log.debug('Set absolute time range from "' + fromTime + '" to "' + toTime + '"');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    }

    public async clickMetric() {
      const button = await testSubjects.find('metricTsvbTypeBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async clickMarkdown() {
      const button = await testSubjects.find('markdownTsvbTypeBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async getMetricValue() {
      const metricValue = await find.byCssSelector('.tvbVisMetric__value--primary');
      return metricValue.getVisibleText();
    }

    public async enterMarkdown(markdown: string) {
      const input = await find.byCssSelector('.tvbMarkdownEditor__editor textarea');
      await this.clearMarkdown();
      const prevRenderingCount = await PageObjects.visualize.getVisualizationRenderingCount();
      await input.type(markdown);
      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
      await PageObjects.visualize.waitForRenderingCount(prevRenderingCount + 1);
    }

    public async clearMarkdown() {
      const input = await find.byCssSelector('.tvbMarkdownEditor__editor textarea');
      // click for switching context(fix for "should render first table variable" test)
      // see _tsvb_markdown.js
      // Since we use ACE editor and that isn't really storing its value inside
      // a textarea we must really select all text and remove it, and cannot use
      // clearValue().
      if (process.platform === 'darwin') {
        await input.pressKeys([browser.keys.COMMAND, 'a']); // Select all Mac
      } else {
        await input.pressKeys([browser.keys.CONTROL, 'a']); // Select all for everything else
      }
      await input.pressKeys(browser.keys.NULL); // Release modifier keys
      await input.pressKeys(browser.keys.BACK_SPACE); // Delete all content
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
      Array<{ key: string; value: string; selector: any }>
    > {
      const testTableVariables = await testSubjects.find('tsvbMarkdownVariablesTable');
      const variablesSelector = 'tbody tr';
      const exists = await find.existsByDisplayedByCssSelector(variablesSelector);
      if (!exists) {
        log.debug('variable list is empty');
        return [];
      }
      const variables: any[] = await testTableVariables.findAllByCssSelector(variablesSelector);

      const variablesKeyValueSelectorMap = await Promise.all(
        variables.map(async (variable: any) => {
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
    public async getSubTabs() {
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
      const prevRenderingCount = await PageObjects.visualize.getVisualizationRenderingCount();
      if (variableName) {
        await find.setValue(SELECTOR, variableName);
      } else {
        const input = await find.byCssSelector(SELECTOR);
        if (process.platform === 'darwin') {
          // Mac workaround
          for (let i = 0; i <= type.length; i++) {
            await input.pressKeys(browser.keys.BACK_SPACE);
          }
        } else {
          await input.pressKeys([browser.keys.CONTROL, 'a']); // Select all for everything else
          await input.pressKeys(browser.keys.NULL); // Release modifier keys
          await input.pressKeys(browser.keys.BACK_SPACE); // Delete all content
        }
      }
      await PageObjects.visualize.waitForRenderingCount(prevRenderingCount + 1);
    }

    public async clickSeriesOption(nth = 0) {
      const el = await testSubjects.findAll('seriesOptions');
      await el[nth].click();
      await PageObjects.common.sleep(500);
    }

    public async clearOffsetSeries() {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async enterOffsetSeries(value: string) {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async getRhythmChartLegendValue() {
      const metricValue = await find.byCssSelector('.tvbLegend__itemValue');
      await metricValue.moveMouseTo();
      return await metricValue.getVisibleText();
    }

    public async clickGauge() {
      await testSubjects.click('gaugeTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
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
      await PageObjects.header.waitUntilLoadingHasFinished();
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
      await PageObjects.header.waitUntilLoadingHasFinished();
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

    public async selectAggType(value: string | number, nth = 0) {
      const elements = await testSubjects.findAll('aggSelector');
      await comboBox.setElement(elements[nth], value);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async fillInExpression(expression: string, nth = 0) {
      const expressions = await testSubjects.findAll('mathExpression');
      await expressions[nth].type(expression);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async fillInVariable(name = 'test', metric = 'count', nth = 0) {
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

    public async setLabelValue(value: string) {
      const el = await testSubjects.find('columnLabelName');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async getViewTable() {
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
  }

  return new VisualBuilderPage();
}
