/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'visEditor', 'visChart']);

  const xyChartSelector = 'xyVisChart';

  describe('vertical bar chart with index without time filter', function () {
    const vizName1 = 'Visualization VerticalBarChart without time filter';

    const initBarChart = async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch(
        PageObjects.visualize.index.LOGSTASH_NON_TIME_BASED
      );
      await PageObjects.common.sleep(500);
      log.debug('Bucket = X-Axis');
      await PageObjects.visEditor.clickBucket('X-axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visEditor.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visEditor.selectField('@timestamp');
      await PageObjects.visEditor.setInterval('3h', { type: 'custom' });
      await PageObjects.visChart.waitForVisualizationRenderingStabilized();
      await PageObjects.visEditor.clickGo(true);
    };

    before(async () => {
      await PageObjects.visualize.initTests();
      await initBarChart();
    });

    it('should save and load', async function () {
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

    describe('vertical bar with split series', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('response.raw');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.common.sleep(1003);
        await PageObjects.visEditor.clickGo(true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = ['503', '404', '200']; // sorting aligned with rendered geometries

        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });
    });

    describe('vertical bar with multiple splits', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('response.raw');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.visEditor.toggleOpenEditor(3, 'false');
        await PageObjects.visEditor.clickBucket('Split series');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('machine.os');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.common.sleep(1003);
        await PageObjects.visEditor.clickGo(true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = [
          '404 - win xp',
          '404 - win 8',
          '404 - win 7',
          '404 - osx',
          '503 - win xp',
          '503 - win 8',
          '503 - win 7',
          '503 - osx',
          '503 - ios',
          '404 - ios',
          '200 - win 7',
          '200 - osx',
          '200 - ios',
          '200 - win xp',
          '200 - win 8',
        ];
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });

      it('should show correct series when disabling first agg', async function () {
        await PageObjects.visEditor.toggleDisabledAgg(3);
        await PageObjects.visEditor.clickGo(true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = ['win 7', 'osx', 'ios', 'win xp', 'win 8'];
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
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.common.sleep(1003);
        await PageObjects.visEditor.clickGo(true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = ['Derivative of Count'];
        const legendEntries = await PageObjects.visChart.getLegendEntriesXYCharts(xyChartSelector);
        expect(legendEntries).to.eql(expectedEntries);
      });
    });
  });
}
