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

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
  ]);

  describe('line charts - split chart', function () {
    const initLineChart = async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickLineChart');
      await PageObjects.visualize.clickLineChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = Split chart');
      await PageObjects.visEditor.clickBucket('Split chart');
      log.debug('Aggregation = Terms');
      await PageObjects.visEditor.selectAggregation('Terms');
      log.debug('Field = extension');
      await PageObjects.visEditor.selectField('extension.raw');
      log.debug('switch from Rows to Columns');
      await PageObjects.visEditor.clickSplitDirection('Columns');
      await PageObjects.visEditor.clickGo();
    };

    before(initLineChart);

    afterEach(async () => {
      await inspector.close();
    });

    it('should show correct chart', async function () {
      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      const expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      // sleep a bit before trying to get the chart data
      await PageObjects.common.sleep(3000);
      const data = await PageObjects.visChart.getLineChartData();
      log.debug('data=' + data);
      const tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
      for (let x = 0; x < data.length; x++) {
        const expected = Number(expectedChartData[x].split(' ')[1].replace(',', ''));
        log.debug(
          'x=' +
            x +
            " expectedChartData[x].split(' ')[1] = " +
            expected +
            '  data[x]=' +
            data[x] +
            ' diff=' +
            Math.abs(expected - data[x])
        );
        expect(Math.abs(expected - data[x]) < tolerance).to.be.ok();
      }
      log.debug('Done');
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct chart order by Term', async function () {
      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      const expectedChartData = ['png 1,373', 'php 445', 'jpg 9,109', 'gif 918', 'css 2,159'];

      log.debug('Order By = Term');
      await PageObjects.visEditor.selectOrderByMetric(2, '_key');
      await PageObjects.visEditor.clickGo();
      await retry.try(async function () {
        const data = await PageObjects.visChart.getLineChartData();
        log.debug('data=' + data);
        const tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
        for (let x = 0; x < data.length; x++) {
          const expected = Number(expectedChartData[x].split(' ')[1].replace(',', ''));
          log.debug(
            'x=' +
              x +
              " expectedChartData[x].split(' ')[1] = " +
              expected +
              '  data[x]=' +
              data[x] +
              ' diff=' +
              Math.abs(expected - data[x])
          );
          expect(Math.abs(expected - data[x]) < tolerance).to.be.ok();
        }
        log.debug('Done');
      });
    });

    it('should show correct data, ordered by Term', async function () {
      const expectedChartData = [
        ['png', '1,373'],
        ['php', '445'],
        ['jpg', '9,109'],
        ['gif', '918'],
        ['css', '2,159'],
      ];

      await inspector.open();
      await inspector.expectTableData(expectedChartData);
    });

    it('should request new data when autofresh is enabled', async () => {
      const intervalS = 3;
      await PageObjects.timePicker.startAutoRefresh(intervalS);

      // check inspector panel request stats for timestamp
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStatsBefore = await inspector.getTableData();
      const requestTimestampBefore = requestStatsBefore.filter((r) =>
        r[0].includes('Request timestamp')
      )[0][1];

      // pause to allow time for autorefresh to fire another request
      await PageObjects.common.sleep(intervalS * 1000 * 1.5);

      // get the latest timestamp from request stats
      const requestStatsAfter = await inspector.getTableData();
      const requestTimestampAfter = requestStatsAfter.filter((r) =>
        r[0].includes('Request timestamp')
      )[0][1];
      log.debug(
        `Timestamp before: ${requestTimestampBefore}, Timestamp after: ${requestTimestampAfter}`
      );

      // cleanup
      await inspector.close();
      await PageObjects.timePicker.pauseAutoRefresh();

      // if autorefresh is working, timestamps should be different
      expect(requestTimestampBefore).not.to.equal(requestTimestampAfter);
    });

    it('should be able to save and load', async function () {
      const vizName = await PageObjects.visChart.getExpectedValue(
        'Visualization Line split chart',
        'Visualization Line split chart - chart library'
      );
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName);

      await PageObjects.visualize.loadSavedVisualization(vizName);
      await PageObjects.visChart.waitForVisualization();
    });

    describe('switch between Y axis scale types', () => {
      before(initLineChart);
      const axisId = 'ValueAxis-1';

      it('should show ticks on selecting log scale', async () => {
        await PageObjects.visEditor.clickMetricsAndAxes();
        await PageObjects.visEditor.clickYAxisOptions(axisId);
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'log');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers();
        const minLabel = 2;
        const maxLabel = 5000;
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show filtered ticks on selecting log scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers();
        const minLabel = 2;
        const maxLabel = 5000;
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show ticks on selecting square root scale', async () => {
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'square root');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        const expectedLabels = ['0', '2,000', '4,000', '6,000', '8,000', '10,000'];

        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        const expectedLabels = ['2,000', '4,000', '6,000', '8,000'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting linear scale', async () => {
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'linear');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        log.debug(labels);
        const expectedLabels = ['0', '2,000', '4,000', '6,000', '8,000', '10,000'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        const expectedLabels = ['2,000', '4,000', '6,000', '8,000'];
        expect(labels).to.eql(expectedLabels);
      });
    });

    describe('pipeline aggregations', () => {
      before(async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        log.debug('clickLineChart');
        await PageObjects.visualize.clickLineChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
      });

      describe('parent pipeline', () => {
        it('should have an error if bucket is not selected', async () => {
          await PageObjects.visEditor.clickMetricEditor();
          log.debug('Metrics agg = Serial diff');
          await PageObjects.visEditor.selectAggregation('Serial diff', 'metrics');
          await testSubjects.existOrFail('bucketsError');
        });

        it('should apply with selected bucket', async () => {
          log.debug('Bucket = X-axis');
          await PageObjects.visEditor.clickBucket('X-axis');
          log.debug('Aggregation = Date Histogram');
          await PageObjects.visEditor.selectAggregation('Date Histogram');
          await PageObjects.visEditor.clickGo();
          const title = await PageObjects.visChart.getYAxisTitle();
          expect(title).to.be('Serial Diff of Count');
        });

        it('should change y-axis label to custom', async () => {
          log.debug('set custom label of y-axis to "Custom"');
          await PageObjects.visEditor.setCustomLabel('Custom', 1);
          await PageObjects.visEditor.clickGo();
          const title = await PageObjects.visChart.getYAxisTitle();
          expect(title).to.be('Custom');
        });

        it('should have advanced accordion and json input', async () => {
          await testSubjects.click('advancedParams-1');
          await testSubjects.existOrFail('advancedParams-1 > codeEditorContainer');
        });
      });

      describe('sibling pipeline', () => {
        it('should apply with selected bucket', async () => {
          log.debug('Metrics agg = Average Bucket');
          await PageObjects.visEditor.selectAggregation('Average Bucket', 'metrics');
          await PageObjects.visEditor.clickGo();
          const title = await PageObjects.visChart.getYAxisTitle();
          expect(title).to.be('Overall Average of Count');
        });

        it('should change sub metric custom label and calculate y-axis title', async () => {
          log.debug('set custom label of sub metric to "Cats"');
          await PageObjects.visEditor.setCustomLabel('Cats', '1-metric');
          await PageObjects.visEditor.clickGo();
          const title = await PageObjects.visChart.getYAxisTitle();
          expect(title).to.be('Overall Average of Cats');
        });

        it('should outer custom label', async () => {
          log.debug('set custom label to "Custom"');
          await PageObjects.visEditor.setCustomLabel('Custom', 1);
          await PageObjects.visEditor.clickGo();
          const title = await PageObjects.visChart.getYAxisTitle();
          expect(title).to.be('Custom');
        });

        it('should have advanced accordion and json input', async () => {
          await testSubjects.click('advancedParams-1');
          await testSubjects.existOrFail('advancedParams-1 > codeEditorContainer');
        });
      });
    });
  });
}
