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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings', 'visualBuilder']);

  describe('visual builder', function describeIndexTests() {

    describe('Time Series', function () {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
      });

      it('should show the correct count in the legend', async function () {
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('156');
      });

      it('should show the correct count in the legend with 2h offset', async function () {
        await PageObjects.visualBuilder.clickSeriesOption();
        await PageObjects.visualBuilder.enterOffsetSeries('2h');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('293');
      });

      it('should show the correct count in the legend with -2h offset', async function () {
        await PageObjects.visualBuilder.enterOffsetSeries('-2h');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('53');
      });

      after(async () => {
        // set back to no offset for the next test, an empty string didn't seem to work here
        await PageObjects.visualBuilder.enterOffsetSeries('0h');
      });

    });

    describe('Math Aggregation', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.createNewAgg();
        await PageObjects.visualBuilder.selectAggType('math', 1);
        await PageObjects.visualBuilder.fillInVariable();
        await PageObjects.visualBuilder.fillInExpression('params.test + 1');
      });

      it('should not have inspector enabled', async function () {
        await inspector.expectIsNotEnabled();
      });

      it('should show correct data', async function () {
        const expectedMetricValue =  '157';
        const value = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${JSON.stringify(value)}`);
        log.debug(`metric value: ${value}`);
        expect(value).to.eql(expectedMetricValue);
      });

    });

    describe('metric', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
      });

      it('should not have inspector enabled', async function () {
        await inspector.expectIsNotEnabled();
      });

      it('should show correct data', async function () {
        const expectedMetricValue =  '156';
        const value = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${value}`);
        expect(value).to.eql(expectedMetricValue);
      });

    });

    // add a gauge test
    describe('gauge', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickGauge();
        log.debug('clicked on Gauge');
      });

      it('should verify gauge label and count display', async function () {
        await retry.try(async () => {
          const labelString = await PageObjects.visualBuilder.getGaugeLabel();
          expect(labelString).to.be('Count');
          const gaugeCount = await PageObjects.visualBuilder.getGaugeCount();
          expect(gaugeCount).to.be('156');
        });
      });
    });

    // add a top N test
    describe('topN', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickTopN();
        log.debug('clicked on TopN');
      });

      it('should verify topN label and count display', async function () {
        const labelString = await PageObjects.visualBuilder.getTopNLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getTopNCount();
        expect(gaugeCount).to.be('156');
      });
    });



    describe('markdown', () => {

      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMarkdown();
        await PageObjects.header.setAbsoluteRange('2015-09-22 06:00:00.000', '2015-09-22 11:00:00.000');
      });

      it('should allow printing raw timestamp of data', async () => {
        await PageObjects.visualBuilder.enterMarkdown('{{ count.data.raw.[0].[0] }}');
        const text = await PageObjects.visualBuilder.getMarkdownText();
        expect(text).to.be('1442901600000');
      });

      it('should allow printing raw value of data', async () => {
        await PageObjects.visualBuilder.enterMarkdown('{{ count.data.raw.[0].[1] }}');
        const text = await PageObjects.visualBuilder.getMarkdownText();
        expect(text).to.be('6');
      });

      describe('allow time offsets', () => {
        before(async () => {
          await PageObjects.visualBuilder.enterMarkdown('{{ count.data.raw.[0].[0] }}#{{ count.data.raw.[0].[1] }}');
          await PageObjects.visualBuilder.clickMarkdownData();
          await PageObjects.visualBuilder.clickSeriesOption();
        });

        it('allow positive time offsets', async () => {
          await PageObjects.visualBuilder.enterOffsetSeries('2h');
          await PageObjects.header.waitUntilLoadingHasFinished();
          const text = await PageObjects.visualBuilder.getMarkdownText();
          const [timestamp, value] = text.split('#');
          expect(timestamp).to.be('1442901600000');
          expect(value).to.be('3');
        });

        it('allow negative time offsets', async () => {
          await PageObjects.visualBuilder.enterOffsetSeries('-2h');
          await PageObjects.header.waitUntilLoadingHasFinished();
          const text = await PageObjects.visualBuilder.getMarkdownText();
          const [timestamp, value] = text.split('#');
          expect(timestamp).to.be('1442901600000');
          expect(value).to.be('23');
        });
      });

    });
    // add a table sanity timestamp
    describe('table', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickTable();
        await PageObjects.header.setAbsoluteRange('2015-09-22 06:00:00.000', '2015-09-22 11:00:00.000');
        log.debug('clicked on Table');
      });

      it('should be able to set values for group by field and column name', async () => {
        await PageObjects.visualBuilder.selectGroupByField('machine.os.raw');
        await PageObjects.visualBuilder.setLabelValue('OS');
        await PageObjects.header.waitUntilLoadingHasFinished();
        log.debug('finished setting field and column name');
      });

      it('should be able verify that values are displayed in the table', async () => {
        const tableData = await PageObjects.visualBuilder.getViewTable();
        log.debug(`Values on ${tableData}`);
        const expectedData = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';
        expect(tableData).to.be(expectedData);
      });
    });

    describe.skip('switch index patterns', () => {
      before(async function () {
        log.debug('Load kibana_sample_data_flights data');
        await esArchiver.loadIfNeeded('kibana_sample_data_flights');
        await PageObjects.visualBuilder.resetPage('2015-09-19 06:31:44.000', '2018-10-31 00:0:00.000');
        await PageObjects.visualBuilder.clickMetric();
      });
      after(async function () {
        await esArchiver.unload('kibana_sample_data_flights');
      });
      it('should be able to switch between index patterns', async () => {
        const expectedMetricValue =  '156';
        const value = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${value}`);
        expect(value).to.eql(expectedMetricValue);
        await PageObjects.visualBuilder.clickMetricPanelOptions();
        const fromTime = '2018-10-22 00:00:00.000';
        const toTime = '2018-10-28 23:59:59.999';
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualBuilder.setIndexPatternValue('kibana_sample_data_flights');
        await PageObjects.visualBuilder.selectIndexPatternTimeField('timestamp');
        const newValue = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${newValue}`);
        expect(newValue).to.eql('10');
      });
    });
  });
}
