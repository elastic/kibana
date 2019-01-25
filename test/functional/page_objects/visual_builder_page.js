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

export function VisualBuilderPageProvider({ getService, getPageObjects }) {
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['common', 'header', 'visualize']);

  class VisualBuilderPage {

    async resetPage() {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-22 18:31:44.000';
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVisualBuilderChart');
      await PageObjects.visualize.clickVisualBuilder();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMetric() {
      const button = await testSubjects.find('metricTsvbTypeBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMarkdown() {
      const button = await testSubjects.find('markdownTsvbTypeBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getMetricValue() {
      const metricValue = await find.byCssSelector('.tvbVisMetric__value--primary');
      return metricValue.getVisibleText();
    }

    async enterMarkdown(markdown) {
      const input = await find.byCssSelector('.tvbMarkdownEditor__editor textarea');
      // Since we use ACE editor and that isn't really storing its value inside
      // a textarea we must really select all text and remove it, and cannot use
      // clearValue().
      if (process.platform === 'darwin') {
        await input.pressKeys([browser.keys.COMMAND, 'a']); // Select all Mac
      } else {
        await input.pressKeys([browser.keys.CONTROL, 'a']); // Select all for everything else
      }
      await input.pressKeys(browser.keys.NULL); // Release modifier keys
      await input.pressKeys(browser.keys.BACKSPACE); // Delete all content
      await input.type(markdown);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getMarkdownText() {
      const el = await find.byCssSelector('.tvbEditorVisualization');
      return await el.getVisibleText();
    }

    async clickMarkdownData() {
      await testSubjects.click('markdownDataBtn');
    }

    async clickSeriesOption(nth = 0) {
      const el = await testSubjects.findAll('seriesOptions');
      await el[nth].click();
      await PageObjects.common.sleep(300);
    }

    async clearOffsetSeries() {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async enterOffsetSeries(value) {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getRhythmChartLegendValue() {
      const metricValue = await find.byCssSelector('.tvbLegend__itemValue');
      await metricValue.moveMouseTo();
      return await metricValue.getVisibleText();
    }

    async clickGauge() {
      await testSubjects.click('gaugeTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getGaugeLabel() {
      const gaugeLabel = await find.byCssSelector('.tvbVisGauge__label');
      return await gaugeLabel.getVisibleText();
    }

    async getGaugeCount() {
      const gaugeCount = await find.byCssSelector('.tvbVisGauge__value');
      return await gaugeCount.getVisibleText();
    }

    async clickTopN() {
      await testSubjects.click('top_nTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getTopNLabel() {
      const topNLabel = await find.byCssSelector('.tvbVisTopN__label');
      return await topNLabel.getVisibleText();
    }

    async getTopNCount() {
      const gaugeCount = await find.byCssSelector('.tvbVisTopN__value');
      return await gaugeCount.getVisibleText();
    }

    async clickTable() {
      await testSubjects.click('tableTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async createNewAgg(nth = 0) {
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

    async selectAggType(value, nth = 0) {
      const elements = await testSubjects.findAll('aggSelector');
      await comboBox.setElement(elements[nth], value);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async fillInExpression(expression, nth = 0) {
      const expressions = await testSubjects.findAll('mathExpression');
      await expressions[nth].type(expression);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async fillInVariable(name = 'test', metric = 'count', nth = 0) {
      const elements = await testSubjects.findAll('varRow');
      const varNameInput = await elements[nth].findByCssSelector('.tvbAggs__varName');
      await varNameInput.type(name);
      const metricSelectWrapper = await elements[nth].findByCssSelector('.tvbAggs__varMetricWrapper');
      await comboBox.setElement(metricSelectWrapper, metric);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }


    async selectGroupByField(fieldName) {
      await comboBox.set('groupByField', fieldName);
    }

    async setLabelValue(value) {
      const el = await testSubjects.find('columnLabelName');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getViewTable() {
      const tableView = await testSubjects.find('tableView');
      return await tableView.getVisibleText();
    }
    async clickMetricPanelOptions() {
      const button = await testSubjects.find('metricEditorPanelOptionsBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }
    async setIndexPatternValue(value) {
      const el = await testSubjects.find('metricsIndexPatternInput');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }
    async selectIndexPatternTimeField(timeField) {
      const el = await testSubjects.find('comboBoxSearchInput');
      await el.clearValue();
      await el.type(timeField);
      await el.pressKeys(browser.keys.RETURN);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }
  }

  return new VisualBuilderPage();
}
