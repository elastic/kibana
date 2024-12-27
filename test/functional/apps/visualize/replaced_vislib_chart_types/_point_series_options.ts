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
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const { visualize, header, timePicker, visEditor, visChart, common } = getPageObjects([
    'visualize',
    'header',
    'timePicker',
    'visEditor',
    'visChart',
    'common',
  ]);
  const inspector = getService('inspector');
  const xyChartSelector = 'xyVisChart';

  async function initChart() {
    log.debug('navigateToApp visualize');
    await visualize.navigateToNewAggBasedVisualization();
    log.debug('clickLineChart');
    await visualize.clickLineChart();
    await visualize.clickNewSearch();
    log.debug('Bucket = X-axis');
    await visEditor.clickBucket('X-axis');
    log.debug('Aggregation = Date Histogram');
    await visEditor.selectAggregation('Date Histogram');
    log.debug('Field = @timestamp');
    await visEditor.selectField('@timestamp');
    // add another metrics
    log.debug('Metric = Value Axis');
    await visEditor.clickBucket('Y-axis', 'metrics');
    log.debug('Aggregation = Average');
    await visEditor.selectAggregation('Average', 'metrics');
    log.debug('Field = memory');
    await visEditor.selectField('machine.ram', 'metrics');
    // go to options page
    log.debug('Going to axis options');
    await visEditor.clickMetricsAndAxes();
    // add another value axis
    log.debug('adding axis');
    await visEditor.clickAddAxis();
    // set average count to use second value axis
    await visEditor.toggleAccordion('visEditorSeriesAccordion3');
    log.debug('Average memory value axis - ValueAxis-2');
    await visEditor.setSeriesAxis(1, 'ValueAxis-2');
    await visChart.waitForVisualizationRenderingStabilized();
    await visEditor.clickGo();
  }

  describe('point series', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await initChart();
    });

    after(async () => {
      await common.unsetTime();
    });

    describe('secondary value axis', function () {
      it('should show correct chart', async function () {
        const expectedChartValues = [
          [
            37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683, 1361, 1415, 707, 177, 27, 32, 175,
            707, 1408, 1355, 726, 201, 29,
          ],
          [
            14018300000, 13284800000, 13198800000, 13093400000, 13067800000, 12976600000,
            13561800000, 14339600000, 14011000000, 12775300000, 13304500000, 12988900000,
            13143500000, 13244400000, 12154800000, 15907300000, 13757300000, 13022200000,
            12807300000, 13375700000, 13190800000, 12627500000, 12731500000, 13153300000,
          ],
        ];

        await retry.try(async () => {
          const data = await visChart.getLineChartData(xyChartSelector, 'Count');
          log.debug('count data=' + data);
          log.debug('data.length=' + data.length);
          expect(data).to.eql(expectedChartValues[0]);
        });

        await retry.try(async () => {
          const avgMemoryData = await visChart.getLineChartData(
            xyChartSelector,
            'Average machine.ram'
          );
          log.debug('average memory data=' + avgMemoryData);
          log.debug('data.length=' + avgMemoryData.length);
          // adjust assertion to make it work on both Chrome & Firefox
          avgMemoryData.map((item, i) => {
            expect(item - expectedChartValues[1][i]).to.be.lessThan(600001);
          });
        });
      });

      it('should not show advanced json for count agg', async function () {
        await testSubjects.missingOrFail('advancedParams-1');
      });

      it('should put secondary axis on the right', async function () {
        const length = await visChart.getAxesCountByPosition('right', xyChartSelector);
        expect(length).to.be(1);
      });
    });

    describe('multiple chart types', function () {
      it('should change average series type to histogram', async function () {
        await visEditor.setSeriesType(1, 'histogram');
        await visEditor.clickGo();
        const length = await visChart.getHistogramSeriesCount(xyChartSelector);
        expect(length).to.be(1);
      });
    });

    describe('grid lines', function () {
      before(async function () {
        await visEditor.clickOptionsTab();
      });

      it('should show category grid lines', async function () {
        await visEditor.toggleGridCategoryLines();
        await visEditor.clickGo();
        const gridLines = await visChart.getGridLines(xyChartSelector);
        // FLAKY relaxing as depends on chart size/browser size and produce differences between local and CI
        // The objective here is to check whenever the grid lines are rendered, not the exact quantity
        expect(gridLines.length).to.be.greaterThan(0);
        gridLines.forEach((gridLine) => {
          expect(gridLine.y).to.be(0);
        });
      });

      it('should show value axis grid lines', async function () {
        await visEditor.setGridValueAxis('ValueAxis-2');
        await visEditor.toggleGridCategoryLines();
        await visEditor.clickGo();
        const gridLines = await visChart.getGridLines(xyChartSelector);
        // FLAKY relaxing as depends on chart size/browser size and produce differences between local and CI
        // The objective here is to check whenever the grid lines are rendered, not the exact quantity
        expect(gridLines.length).to.be.greaterThan(0);
        gridLines.forEach((gridLine) => {
          expect(gridLine.x).to.be(0);
        });
      });
    });

    describe('show values on chart', () => {
      before(async () => {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickVerticalBarChart();
        await visualize.clickNewSearch();
        log.debug('Bucket = X-axis');
        await visEditor.clickBucket('X-axis');
        log.debug('Aggregation = Terms');
        await visEditor.selectAggregation('Terms');
        log.debug('Field = geo.src');
        await visEditor.selectField('geo.src');
        await visEditor.clickGo();
        log.debug('Open Options tab');
        await visEditor.clickOptionsTab();
      });

      it('should show values on bar chart', async () => {
        await visEditor.toggleValuesOnChart();
        await visEditor.clickGo();
        const values = await visChart.getChartValues(xyChartSelector);
        expect(values).to.eql(['2,592', '2,373', '1,194', '489', '415']);
      });

      it('should hide values on bar chart', async () => {
        await visEditor.toggleValuesOnChart();
        await visEditor.clickGo();
        const values = await visChart.getChartValues(xyChartSelector);
        expect(values.length).to.be(0);
      });
    });

    describe('custom labels and axis titles', function () {
      const visName = 'Visualization Point Series Test';
      const customLabel = 'myLabel';
      const axisTitle = 'myTitle';
      before(async function () {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickLineChart();
        await visualize.clickNewSearch();
        await visEditor.selectYAxisAggregation('Average', 'bytes', customLabel, 1);
        await visEditor.clickGo();
        await visEditor.clickMetricsAndAxes();
        await visEditor.clickYAxisOptions('ValueAxis-1');
      });

      it('should render a custom label when one is set', async function () {
        const title = await visChart.getYAxisTitle(xyChartSelector);
        expect(title).to.be(customLabel);
      });

      it('should render a custom axis title when one is set, overriding the custom label', async function () {
        await visEditor.setAxisTitle(axisTitle);
        await visEditor.clickGo();
        const title = await visChart.getYAxisTitle(xyChartSelector);
        expect(title).to.be(axisTitle);
      });

      it('should preserve saved axis titles after a vis is saved and reopened', async function () {
        await visualize.saveVisualizationExpectSuccess(visName);
        await visChart.waitForVisualization();
        await visualize.loadSavedVisualization(visName);
        await visChart.waitForRenderingCount();
        await visEditor.clickDataTab();
        await visEditor.toggleOpenEditor(1);
        await visEditor.setCustomLabel('test', 1);
        await visEditor.clickGo();
        await visEditor.clickMetricsAndAxes();
        await visEditor.clickYAxisOptions('ValueAxis-1');
        const title = await visChart.getYAxisTitle(xyChartSelector);
        expect(title).to.be(axisTitle);
      });
    });

    describe('timezones', function () {
      it('should show round labels in default timezone', async function () {
        const expectedLabels = [
          '2015-09-20 00:00',
          '2015-09-21 00:00',
          '2015-09-22 00:00',
          '2015-09-23 00:00',
        ];
        await initChart();
        const labels = await visChart.getXAxisLabels(xyChartSelector);
        expect(labels.join()).to.contain(expectedLabels.join());
      });

      it('should show round labels in different timezone', async function () {
        const expectedLabels = [
          '2015-09-20 00:00',
          '2015-09-21 00:00',
          '2015-09-22 00:00',
          '2015-09-23 00:00',
        ];

        await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'America/Phoenix' });
        await browser.refresh();
        await header.awaitKibanaChrome();
        await initChart();

        const labels = await visChart.getXAxisLabels(xyChartSelector);

        expect(labels.join()).to.contain(expectedLabels.join());
      });

      it('should show different labels in different timezone', async function () {
        const fromTime = 'Sep 22, 2015 @ 09:05:47.415';
        const toTime = 'Sep 22, 2015 @ 16:08:34.554';
        // note that we're setting the absolute time range while we're in 'America/Phoenix' tz
        await timePicker.setAbsoluteRange(fromTime, toTime);
        await visChart.waitForRenderingCount();

        await retry.waitForWithTimeout(
          'wait for x-axis labels to match expected for Phoenix',
          5000,
          async () => {
            const labels = (await visChart.getXAxisLabels(xyChartSelector)) ?? '';
            log.debug(`Labels: ${labels}`);

            const xLabels = [
              '09:30',
              '10:00',
              '10:30',
              '11:00',
              '11:30',
              '12:00',
              '12:30',
              '13:00',
              '13:30',
              '14:00',
              '14:30',
              '15:00',
              '15:30',
              '16:00',
            ];
            return labels.toString() === xLabels.toString();
          }
        );

        const expectedTableData = [
          ['09:05', '13', '13,463,070,562.462'],
          ['09:10', '23', '11,518,321,384.727'],
          ['09:15', '24', '12,437,509,461.333'],
          ['09:20', '30', '14,439,976,253.793'],
          ['09:25', '23', '11,017,524,802.783'],
          ['09:30', '30', '10,774,443,820.138'],
          ['09:35', '25', '10,565,619,548.16'],
          ['09:40', '21', '16,412,910,738.286'],
          ['09:45', '21', '13,207,024,435.2'],
          ['09:50', '26', '12,091,266,626.783'],
          ['09:55', '11', '8,882,773,271.273'],
          ['10:00', '17', '15,367,929,856'],
          ['10:05', '17', '10,990,063,375.059'],
          ['10:10', '11', '12,884,901,888'],
          ['10:15', '14', '10,200,547,328'],
          ['10:20', '21', '12,240,656,793.6'],
          ['10:25', '10', '10,737,418,240'],
          ['10:30', '12', '10,111,068,842.667'],
          ['10:35', '10', '11,381,663,334.4'],
          ['10:40', '14', '11,657,768,374.857'],
        ];
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
        log.debug("set 'dateFormat:tz': 'UTC'");
        await kibanaServer.uiSettings.update({
          'dateFormat:tz': 'UTC',
          defaultIndex: 'logstash-*',
        });
        // We set the tz from 'America/Phoenix' to UTC and refreshing the browser but not re-entering
        // the absolute time range so the timepicker is going to shift +7 hours.
        await browser.refresh();
        // wait some time before trying to check for rendering count
        await header.awaitKibanaChrome();
        await visualize.clickRefresh();
        await visChart.waitForRenderingCount();
        log.debug('getXAxisLabels');

        await retry.waitForWithTimeout(
          'wait for x-axis labels to match expected for UTC',
          5000,
          async () => {
            const labels2 = (await visChart.getXAxisLabels(xyChartSelector)) ?? '';
            log.debug(`Labels: ${labels2}`);

            const xLabels2 = [
              '16:30',
              '17:00',
              '17:30',
              '18:00',
              '18:30',
              '19:00',
              '19:30',
              '20:00',
              '20:30',
              '21:00',
              '21:30',
              '22:00',
              '22:30',
              '23:00',
            ];
            return labels2.toString() === xLabels2.toString();
          }
        );

        // the expected inspector data is the same but with timestamps shifted +7 hours
        const expectedTableData2 = [
          ['16:05', '13', '13,463,070,562.462'],
          ['16:10', '23', '11,518,321,384.727'],
          ['16:15', '24', '12,437,509,461.333'],
          ['16:20', '30', '14,439,976,253.793'],
          ['16:25', '23', '11,017,524,802.783'],
          ['16:30', '30', '10,774,443,820.138'],
          ['16:35', '25', '10,565,619,548.16'],
          ['16:40', '21', '16,412,910,738.286'],
          ['16:45', '21', '13,207,024,435.2'],
          ['16:50', '26', '12,091,266,626.783'],
          ['16:55', '11', '8,882,773,271.273'],
          ['17:00', '17', '15,367,929,856'],
          ['17:05', '17', '10,990,063,375.059'],
          ['17:10', '11', '12,884,901,888'],
          ['17:15', '14', '10,200,547,328'],
          ['17:20', '21', '12,240,656,793.6'],
          ['17:25', '10', '10,737,418,240'],
          ['17:30', '12', '10,111,068,842.667'],
          ['17:35', '10', '11,381,663,334.4'],
          ['17:40', '14', '11,657,768,374.857'],
        ];
        await inspector.open();
        await inspector.expectTableData(expectedTableData2);
        log.debug('close inspector');
        await inspector.close();
      });

      after(async () => {
        const timezone = await kibanaServer.uiSettings.get('dateFormat:tz');

        // make sure the timezone was set to default correctly to avoid further failures
        // for details see https://github.com/elastic/kibana/issues/63037
        if (timezone !== 'UTC') {
          log.debug("set 'dateFormat:tz': 'UTC'");
          await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'UTC' });
        }
      });
    });
  });
}
