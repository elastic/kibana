/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const { common, visualize, visEditor, visChart, timePicker } = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
  ]);
  const xyChartSelector = 'xyVisChart';

  describe('line charts - split series', function () {
    const initLineChart = async function () {
      log.debug('navigateToApp visualize');
      await visualize.navigateToNewAggBasedVisualization();
      log.debug('clickLineChart');
      await visualize.clickLineChart();
      await visualize.clickNewSearch();
      log.debug('Bucket = Split chart');
      await visEditor.clickBucket('Split series');
      log.debug('Aggregation = Terms');
      await visEditor.selectAggregation('Terms');
      log.debug('Field = extension');
      await visEditor.selectField('extension.raw');
      await visEditor.clickGo(true);
    };

    before(async () => {
      await visualize.initTests();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await initLineChart();
    });

    after(async () => {
      await common.unsetTime();
    });

    afterEach(async () => {
      await inspector.close();
    });

    it('should show correct chart', async function () {
      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      const expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      // sleep a bit before trying to get the chart data
      await common.sleep(3000);
      const data = await visChart.getLineChartData(xyChartSelector);
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
      await visEditor.selectOrderByMetric(2, '_key');
      await visEditor.clickGo(true);
      await retry.try(async function () {
        const data = await visChart.getLineChartData(xyChartSelector);
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
        ['png', '1,373', '_all'],
        ['php', '445', '_all'],
        ['jpg', '9,109', '_all'],
        ['gif', '918', '_all'],
        ['css', '2,159', '_all'],
      ];

      await inspector.open();
      await inspector.expectTableData(expectedChartData);
    });

    it('should request new data when autofresh is enabled', async () => {
      const intervalS = 3;
      await timePicker.startAutoRefresh(intervalS);

      // check inspector panel request stats for timestamp
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStatsBefore = await inspector.getTableData();
      const requestTimestampBefore = requestStatsBefore.filter((r) =>
        r[0].includes('Request timestamp')
      )[0][1];

      // pause to allow time for autorefresh to fire another request
      await common.sleep(intervalS * 1000 * 1.5);

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
      await timePicker.pauseAutoRefresh();

      // if autorefresh is working, timestamps should be different
      expect(requestTimestampBefore).not.to.equal(requestTimestampAfter);
    });

    it('should be able to save and load', async function () {
      const vizName = 'Visualization Line split series';

      await visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName);

      await visualize.loadSavedVisualization(vizName);
      await visChart.waitForVisualization();
    });

    describe('switch between Y axis scale types', () => {
      before(initLineChart);
      const axisId = 'ValueAxis-1';

      it('should show ticks on selecting log scale', async () => {
        await visEditor.clickMetricsAndAxes();
        await visEditor.clickYAxisOptions(axisId);
        await visEditor.selectYAxisScaleType(axisId, 'log');
        await visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await visEditor.clickGo(true);
        const labels = await visChart.getYAxisLabelsAsNumbers(xyChartSelector);
        const minLabel = 1;
        const maxLabel = 900;
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show filtered ticks on selecting log scale', async () => {
        await visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await visEditor.clickGo(true);
        const labels = await visChart.getYAxisLabelsAsNumbers(xyChartSelector);
        const minLabel = 1;
        const maxLabel = 900;
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show ticks on selecting square root scale', async () => {
        await visEditor.selectYAxisScaleType(axisId, 'square root');
        await visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await visEditor.clickGo(true);
        const labels = await visChart.getYAxisLabels(xyChartSelector);
        const expectedLabels = ['0', '2,000', '4,000', '6,000', '8,000'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await visEditor.clickGo(true);
        const labels = await visChart.getYAxisLabels(xyChartSelector);
        const expectedLabels = ['0', '2,000', '4,000', '6,000', '8,000'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting linear scale', async () => {
        await visEditor.selectYAxisScaleType(axisId, 'linear');
        await visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await visEditor.clickGo(true);
        const labels = await visChart.getYAxisLabels(xyChartSelector);
        log.debug(labels);
        const expectedLabels = ['0', '2,000', '4,000', '6,000', '8,000'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await visEditor.clickGo(true);
        const labels = await visChart.getYAxisLabels(xyChartSelector);
        const expectedLabels = ['0', '2,000', '4,000', '6,000', '8,000'];
        expect(labels).to.eql(expectedLabels);
      });
    });

    describe('pipeline aggregations', () => {
      before(async () => {
        log.debug('navigateToApp visualize');
        await visualize.navigateToNewAggBasedVisualization();
        log.debug('clickLineChart');
        await visualize.clickLineChart();
        await visualize.clickNewSearch();
      });

      describe('parent pipeline', () => {
        it('should have an error if bucket is not selected', async () => {
          await visEditor.clickMetricEditor();
          log.debug('Metrics agg = Serial diff');
          await visEditor.selectAggregation('Serial diff', 'metrics');
          await testSubjects.existOrFail('bucketsError');
        });

        it('should apply with selected bucket', async () => {
          log.debug('Bucket = X-axis');
          await visEditor.clickBucket('X-axis');
          log.debug('Aggregation = Date Histogram');
          await visEditor.selectAggregation('Date Histogram');
          await visEditor.clickGo(true);
          const title = await visChart.getYAxisTitle(xyChartSelector);
          expect(title).to.be('Serial Diff of Count');
        });

        it('should change y-axis label to custom', async () => {
          log.debug('set custom label of y-axis to "Custom"');
          await visEditor.setCustomLabel('Custom', 1);
          await visEditor.clickGo(true);
          const title = await visChart.getYAxisTitle(xyChartSelector);
          expect(title).to.be('Custom');
        });

        it('should have advanced accordion and json input', async () => {
          await testSubjects.click('advancedParams-1');
          await find.byCssSelector('.euiAccordion .react-monaco-editor-container');
        });
      });

      describe('sibling pipeline', () => {
        it('should apply with selected bucket', async () => {
          log.debug('Metrics agg = Average Bucket');
          await visEditor.selectAggregation('Average Bucket', 'metrics');
          await visEditor.clickGo(true);
          const title = await visChart.getYAxisTitle(xyChartSelector);
          expect(title).to.be('Overall Average of Count');
        });

        it('should change sub metric custom label and calculate y-axis title', async () => {
          log.debug('set custom label of sub metric to "Cats"');
          await visEditor.setCustomLabel('Cats', '1-metric');
          await visEditor.clickGo(true);
          const title = await visChart.getYAxisTitle(xyChartSelector);
          expect(title).to.be('Overall Average of Cats');
        });

        it('should outer custom label', async () => {
          log.debug('set custom label to "Custom"');
          await visEditor.setCustomLabel('Custom', 1);
          await visEditor.clickGo(true);
          const title = await visChart.getYAxisTitle(xyChartSelector);
          expect(title).to.be('Custom');
        });

        it('should have advanced accordion and json input', async () => {
          await testSubjects.click('advancedParams-1');
          await find.byCssSelector('.euiAccordion .react-monaco-editor-container');
        });
      });
    });
  });
}
