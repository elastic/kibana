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
  const retry = getService('retry');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects([
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
    'common',
  ]);

  const xyChartSelector = 'xyVisChart';

  describe('vertical bar chart', function () {
    before(async () => {
      await PageObjects.visualize.initTests();
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await PageObjects.common.unsetTime();
    });

    const vizName1 = 'Visualization VerticalBarChart';

    const initBarChart = async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Bucket = X-Axis');
      await PageObjects.visEditor.clickBucket('X-axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visEditor.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visEditor.selectField('@timestamp');
      // leaving Interval set to Auto
      await PageObjects.visEditor.clickGo(true);
    };

    describe('bar charts x axis tick labels', () => {
      it('should show tick labels also after rotation of the chart', async function () {
        await initBarChart();
        const bottomLabels = await PageObjects.visChart.getXAxisLabels(xyChartSelector);
        log.debug(`${bottomLabels.length} tick labels on bottom x axis`);

        await PageObjects.visEditor.clickMetricsAndAxes();
        await PageObjects.visEditor.selectXAxisPosition('left');
        await PageObjects.visEditor.clickGo(true);

        // the getYAxisLabels helper always returns the labels on the left axis
        const leftLabels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        log.debug(`${leftLabels.length} tick labels on left x axis`);
        expect(leftLabels.length).to.be.greaterThan(bottomLabels.length * (2 / 3));
      });

      it('should not filter out first label after rotation of the chart', async function () {
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickVerticalBarChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visEditor.clickBucket('X-axis');
        await PageObjects.visEditor.selectAggregation('Date Range');
        await PageObjects.visEditor.selectField('@timestamp');

        await PageObjects.visEditor.clickGo(true);
        const bottomLabels = await PageObjects.visChart.getXAxisLabels(xyChartSelector);
        expect(bottomLabels.length).to.be(1);

        await PageObjects.visEditor.clickMetricsAndAxes();
        await PageObjects.visEditor.selectXAxisPosition('left');
        await PageObjects.visEditor.clickGo(true);

        // the getYAxisLabels helper always returns the labels on the left axis
        const leftLabels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        expect(leftLabels.length).to.be(1);
      });
    });

    describe('bar charts range on x axis', () => {
      it('should individual bars for each configured range', async function () {
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickVerticalBarChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visEditor.clickBucket('X-axis');
        log.debug('Aggregation = Date Range');
        await PageObjects.visEditor.selectAggregation('Date Range');
        log.debug('Field = @timestamp');
        await PageObjects.visEditor.selectField('@timestamp');
        await PageObjects.visEditor.clickAddDateRange();
        await PageObjects.visEditor.setDateRangeByIndex('1', 'now-2w/w', 'now-1w/w');
        await PageObjects.visEditor.clickGo(true);
        const bottomLabels = await PageObjects.visChart.getXAxisLabels(xyChartSelector);
        expect(bottomLabels.length).to.be(2);
      });
    });

    it('should save and load', async function () {
      await initBarChart();
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visChart.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct chart', async function () {
      const expectedChartValues = [
        37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683, 1361, 1415, 707, 177, 27, 32, 175,
        707, 1408, 1355, 726, 201, 29,
      ];

      // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
      // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
      // try sleeping a bit before getting that data
      await retry.try(async () => {
        const data = await PageObjects.visChart.getBarChartData(xyChartSelector);
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });
    });

    it('should show correct data', async function () {
      // this is only the first page of the tabular data.
      const expectedChartData = [
        ['2015-09-20 00:00', '37'],
        ['2015-09-20 03:00', '202'],
        ['2015-09-20 06:00', '740'],
        ['2015-09-20 09:00', '1,437'],
        ['2015-09-20 12:00', '1,371'],
        ['2015-09-20 15:00', '751'],
        ['2015-09-20 18:00', '188'],
        ['2015-09-20 21:00', '31'],
        ['2015-09-21 00:00', '42'],
        ['2015-09-21 03:00', '202'],
        ['2015-09-21 06:00', '683'],
        ['2015-09-21 09:00', '1,361'],
        ['2015-09-21 12:00', '1,415'],
        ['2015-09-21 15:00', '707'],
        ['2015-09-21 18:00', '177'],
        ['2015-09-21 21:00', '27'],
        ['2015-09-22 00:00', '32'],
        ['2015-09-22 03:00', '175'],
        ['2015-09-22 06:00', '707'],
        ['2015-09-22 09:00', '1,408'],
      ];

      await inspector.open();
      await inspector.expectTableData(expectedChartData);
      await inspector.close();
    });

    it('should have `drop partial buckets` option', async () => {
      const fromTime = 'Sep 20, 2015 @ 06:31:44.000';
      const toTime = 'Sep 22, 2015 @ 18:31:44.000';

      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

      let expectedChartValues = [
        82, 218, 341, 440, 480, 517, 522, 446, 403, 321, 258, 172, 95, 55, 38, 24, 3, 4, 11, 14, 17,
        38, 49, 115, 152, 216, 315, 402, 446, 513, 520, 474, 421, 307, 230, 170, 99, 48, 30, 15, 10,
        2, 8, 7, 17, 34, 37, 104, 153, 241, 313, 404, 492, 512, 503, 473, 379, 293, 277, 156, 56,
      ];

      // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
      // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
      // try sleeping a bit before getting that data
      await retry.try(async () => {
        const data = await PageObjects.visChart.getBarChartData(xyChartSelector);
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });

      await PageObjects.visEditor.toggleOpenEditor(2);
      await PageObjects.visEditor.clickDropPartialBuckets();
      await PageObjects.visEditor.clickGo(true);

      expectedChartValues = [
        218, 341, 440, 480, 517, 522, 446, 403, 321, 258, 172, 95, 55, 38, 24, 3, 4, 11, 14, 17, 38,
        49, 115, 152, 216, 315, 402, 446, 513, 520, 474, 421, 307, 230, 170, 99, 48, 30, 15, 10, 2,
        8, 7, 17, 34, 37, 104, 153, 241, 313, 404, 492, 512, 503, 473, 379, 293, 277, 156,
      ];

      // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
      // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
      // try sleeping a bit before getting that data
      await retry.try(async () => {
        const data = await PageObjects.visChart.getBarChartData(xyChartSelector);
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });
    });

    describe('switch between Y axis scale types', () => {
      before(initBarChart);
      const axisId = 'ValueAxis-1';

      it('should show ticks on selecting log scale', async () => {
        await PageObjects.visEditor.clickMetricsAndAxes();
        await PageObjects.visEditor.clickYAxisOptions(axisId);
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'log');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers(xyChartSelector);

        const minLabel = 1;
        const maxLabel = 900;
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show filtered ticks on selecting log scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers(xyChartSelector);

        const minLabel = 1;
        const maxLabel = 900;
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show ticks on selecting square root scale', async () => {
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'square root');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        const expectedLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        const expectedLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting linear scale', async () => {
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'linear');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        log.debug(labels);
        const expectedLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        const expectedLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400'];
        expect(labels).to.eql(expectedLabels);
      });
    });

    describe('vertical bar in percent mode', () => {
      it('should show ticks with percentage values', async function () {
        const axisId = 'ValueAxis-1';
        await PageObjects.visEditor.clickMetricsAndAxes();
        await PageObjects.visEditor.clickYAxisOptions(axisId);
        await PageObjects.visEditor.selectYAxisMode('percentage');
        await PageObjects.visEditor.changeYAxisShowCheckbox(axisId, true);
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo(true);
        const labels = await PageObjects.visChart.getYAxisLabels(xyChartSelector);
        expect(labels[0]).to.eql('0%');
        expect(labels[labels.length - 1]).to.eql('100%');
      });
    });

    describe('vertical bar with Split series', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('response.raw');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        await PageObjects.visEditor.clickGo(true);

        const expectedEntries = ['200', '404', '503']; // sorting order aligned with the reading direction
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });

      it('should allow custom sorting of series', async () => {
        await PageObjects.visEditor.toggleOpenEditor(1, 'false');
        await PageObjects.visEditor.selectCustomSortMetric(3, 'Min', 'bytes');
        await PageObjects.visEditor.clickGo(true);

        const expectedEntries = ['404', '200', '503'];
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });

      it('should correctly filter by legend', async () => {
        await PageObjects.visChart.filterLegend('200', true);
        await PageObjects.visChart.waitForVisualization();
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        const expectedEntries = ['200'];
        expect(legendEntries).to.eql(expectedEntries);
        await filterBar.removeFilter('response.raw');
        await PageObjects.visChart.waitForVisualization();
      });
    });

    describe('vertical bar with multiple splits', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('response.raw');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();

        await PageObjects.visEditor.toggleOpenEditor(3, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('machine.os');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        await PageObjects.visEditor.clickGo(true);

        const expectedEntries = [
          '200 - win 8',
          '200 - win xp',
          '200 - ios',
          '200 - osx',
          '200 - win 7',
          '404 - ios',
          '503 - ios',
          '503 - osx',
          '503 - win 7',
          '503 - win 8',
          '503 - win xp',
          '404 - osx',
          '404 - win 7',
          '404 - win 8',
          '404 - win xp',
        ];
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });

      it('should show correct series when disabling first agg', async function () {
        // this will avoid issues with the play tooltip covering the disable agg button
        await testSubjects.scrollIntoView('metricsAggGroup');
        await PageObjects.visEditor.toggleDisabledAgg(3);
        await PageObjects.visEditor.clickGo(true);

        const expectedEntries = ['win 8', 'win xp', 'ios', 'osx', 'win 7'];
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });
    });

    describe('vertical bar with derivative', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.toggleOpenEditor(1);
        await PageObjects.visEditor.selectAggregation('Derivative', 'metrics');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        await PageObjects.visEditor.clickGo(true);

        const expectedEntries = ['Derivative of Count'];
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });

      it('should show an error if last bucket aggregation is terms', async () => {
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('response.raw');

        const errorMessage = await PageObjects.visEditor.getBucketErrorMessage();
        expect(errorMessage).to.contain('Last bucket aggregation must be "Date Histogram"');
      });
    });
  });
}
