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

import Keys from 'leadfoot/keys';

export function VisualBuilderPageProvider({ getService, getPageObjects }) {
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'visualize']);

  class VisualBuilderPage {

    async resetPage() {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-22 18:31:44.000';
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.header.waitUntilLoadingHasFinished();
      log.debug('clickVisualBuilderChart');
      await find.clickByPartialLinkText('Visual Builder');
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
      const metricValue = await find.byCssSelector('.rhythm_metric__primary-value');
      return metricValue.getVisibleText();
    }

    async enterMarkdown(markdown) {
      const input = await find.byCssSelector('.vis_editor__markdown-editor textarea');
      // Since we use ACE editor and that isn't really storing its value inside
      // a textarea we must really select all text and remove it, and cannot use
      // clearValue().
      await input.session.pressKeys([Keys.CONTROL, 'a']); // Select all text
      await input.session.pressKeys(Keys.NULL); // Release modifier keys
      await input.session.pressKeys(Keys.BACKSPACE); // Delete all content
      await input.type(markdown);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getMarkdownText() {
      const el = await find.byCssSelector('.vis_editor__visualization');
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
      const metricValue = await find.byCssSelector('.rhythm_chart__legend_value');
      await metricValue.session.moveMouseTo(metricValue);
      return await metricValue.getVisibleText();
    }

    async clickGauge() {
      await testSubjects.click('gaugeTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getGaugeLabel() {
      const gaugeLabel = await find.byCssSelector('.thorHalfGauge__label');
      return await gaugeLabel.getVisibleText();
    }

    async getGaugeCount() {
      const gaugeCount = await find.byCssSelector('.thorHalfGauge__value');
      return await gaugeCount.getVisibleText();
    }

    async clickTopN()
    {
      await testSubjects.click('top_nTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getTopNLabel() {
      const topNLabel = await find.byCssSelector('.rhythm_top_n__label');
      return await topNLabel.getVisibleText();
    }

    async getTopNCount() {
      const gaugeCount = await find.byCssSelector('.rhythm_top_n__value');
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
      await PageObjects.visualize.setComboBoxElement(elements[nth], value);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async fillInExpression(expression, nth = 0) {
      const expressions = await testSubjects.findAll('mathExpression');
      await expressions[nth].type(expression);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async fillInVariable(name = 'test', metric = 'count', nth = 0) {
      const elements = await testSubjects.findAll('varRow');
      const varNameInput = await elements[nth].findByCssSelector('.vis_editor__calc_vars-name input');
      await varNameInput.type(name);
      const metricSelectWrapper = await elements[nth].findByCssSelector('.vis_editor__calc_vars-var');
      await PageObjects.visualize.setComboBoxElement(metricSelectWrapper, metric);
      return await PageObjects.header.waitUntilLoadingHasFinished();
    }


    async selectGroupByField(fieldName) {
      const element = await testSubjects.find('groupByField');
      await PageObjects.visualize.setComboBoxElement(element, fieldName);
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


  }

  return new VisualBuilderPage();
}
