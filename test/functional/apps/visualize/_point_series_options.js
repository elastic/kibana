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

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'pointSeries', 'timePicker']);
  const pointSeriesVis = PageObjects.pointSeries;
  const inspector = getService('inspector');

  async function initChart() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    log.debug('navigateToApp visualize');
    await PageObjects.visualize.navigateToNewVisualization();
    log.debug('clickLineChart');
    await PageObjects.visualize.clickLineChart();
    await PageObjects.visualize.clickNewSearch();
    await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    log.debug('Bucket = X-Axis');
    await PageObjects.visualize.clickBucket('X-Axis');
    log.debug('Aggregation = Date Histogram');
    await PageObjects.visualize.selectAggregation('Date Histogram');
    log.debug('Field = @timestamp');
    await PageObjects.visualize.selectField('@timestamp');
    // add another metrics
    log.debug('Add Metric');
    await PageObjects.visualize.clickAddMetric();
    log.debug('Metric = Value Axis');
    await PageObjects.visualize.clickBucket('Y-Axis', 'metric');
    log.debug('Aggregation = Average');
    await PageObjects.visualize.selectAggregation('Average', 'metrics');
    log.debug('Field = memory');
    await PageObjects.visualize.selectField('machine.ram', 'metrics');
    // go to options page
    log.debug('Going to axis options');
    await pointSeriesVis.clickAxisOptions();
    // add another value axis
    log.debug('adding axis');
    await pointSeriesVis.clickAddAxis();
    // set average count to use second value axis
    await pointSeriesVis.toggleCollapsibleTitle('Average machine.ram');
    log.debug('Average memory value axis - ValueAxis-2');
    await pointSeriesVis.setSeriesAxis(1, 'ValueAxis-2');
    await PageObjects.visualize.waitForVisualizationRenderingStabilized();
    await PageObjects.visualize.clickGo();
  }

  describe('point series', function describeIndexTests() {
    before(initChart);

    describe('secondary value axis', function () {

      it('should show correct chart', async function () {
        const expectedChartValues = [
          [ 37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
            1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29 ],
          [ 14018300000, 13284800000, 13198800000, 13093400000, 13067800000,
            12976600000, 13561800000, 14339600000, 14011000000, 12775300000,
            13304500000, 12988900000, 13143500000, 13244400000, 12154800000,
            15907300000, 13757300000, 13022200000, 12807300000, 13375700000,
            13190800000, 12627500000, 12731500000, 13153300000 ],
        ];

        await retry.try(async () => {
          const data = await PageObjects.visualize.getLineChartData('Count');
          log.debug('count data=' + data);
          log.debug('data.length=' + data.length);
          expect(data).to.eql(expectedChartValues[0]);
        });

        await retry.try(async () => {
          const avgMemoryData = await PageObjects.visualize.getLineChartData('Average machine.ram', 'ValueAxis-2');
          log.debug('average memory data=' + avgMemoryData);
          log.debug('data.length=' + avgMemoryData.length);
          expect(avgMemoryData).to.eql(expectedChartValues[1]);
        });
      });

      it('should put secondary axis on the right', async function () {
        const length = await pointSeriesVis.getRightValueAxes();
        expect(length).to.be(1);
      });
    });

    describe('multiple chart types', function () {
      it('should change average series type to histogram', async function () {
        await pointSeriesVis.toggleCollapsibleTitle('RightAxis-1');
        await pointSeriesVis.setSeriesType(1, 'bar');
        await PageObjects.visualize.clickGo();
        const length = await pointSeriesVis.getHistogramSeries();
        expect(length).to.be(1);
      });
    });

    describe('grid lines', function () {
      before(async function () {
        await pointSeriesVis.clickOptions();
      });

      it('should show category grid lines', async function () {
        await pointSeriesVis.toggleGridCategoryLines();
        await PageObjects.visualize.clickGo();
        const gridLines = await pointSeriesVis.getGridLines();
        expect(gridLines.length).to.be(9);
        gridLines.forEach(gridLine => {
          expect(gridLine.y).to.be(0);
        });
      });

      it('should show value axis grid lines', async function () {
        await pointSeriesVis.setGridValueAxis('ValueAxis-2');
        await pointSeriesVis.toggleGridCategoryLines();
        await PageObjects.visualize.clickGo();
        const gridLines = await pointSeriesVis.getGridLines();
        expect(gridLines.length).to.be(9);
        gridLines.forEach(gridLine => {
          expect(gridLine.x).to.be(0);
        });
      });
    });

    describe('custom labels and axis titles', function () {
      const visName = 'Visualization Point Series Test';
      const customLabel = 'myLabel';
      const axisTitle = 'myTitle';
      before(async function () {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickLineChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.selectYAxisAggregation('Average', 'bytes', customLabel, 1);
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.clickMetricsAndAxes();
        await PageObjects.visualize.clickYAxisOptions('ValueAxis-1');
      });

      it('should render a custom label when one is set', async function () {
        const title = await PageObjects.visualize.getYAxisTitle();
        expect(title).to.be(customLabel);
      });

      it('should render a custom axis title when one is set, overriding the custom label', async function () {
        await pointSeriesVis.setAxisTitle(axisTitle);
        await PageObjects.visualize.clickGo();
        const title = await PageObjects.visualize.getYAxisTitle();
        expect(title).to.be(axisTitle);
      });

      it('should preserve saved axis titles after a vis is saved and reopened', async function () {
        await PageObjects.visualize.saveVisualizationExpectSuccess(visName);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.loadSavedVisualization(visName);
        await PageObjects.visualize.waitForRenderingCount();
        await PageObjects.visualize.clickData();
        await PageObjects.visualize.toggleOpenEditor(1);
        await PageObjects.visualize.setCustomLabel('test', 1);
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.clickMetricsAndAxes();
        await PageObjects.visualize.clickYAxisOptions('ValueAxis-1');
        const title = await PageObjects.visualize.getYAxisTitle();
        expect(title).to.be(axisTitle);
      });
    });

    describe('timezones', async function () {
      const expectedLabels = [
        '2015-09-20 00:00',
        '2015-09-21 00:00',
        '2015-09-22 00:00',
        '2015-09-23 00:00',
      ];

      it('should show round labels in default timezone', async function () {
        await initChart();
        const labels = await PageObjects.visualize.getXAxisLabels();
        expect(labels).to.eql(expectedLabels);
      });

      it('should show round labels in different timezone', async function () {
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'America/Phoenix' });
        await browser.refresh();
        await initChart();

        const labels = await PageObjects.visualize.getXAxisLabels();

        expect(labels).to.eql(expectedLabels);
      });

      it('should show different labels in different timezone', async function () {
        const fromTime = '2015-09-22 09:05:47.415';
        const toTime = '2015-09-22 16:08:34.554';
        // note that we're setting the absolute time range while we're in 'America/Phoenix' tz
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForRenderingCount();

        await retry.waitFor('wait for x-axis labels to match expected for Phoenix', async () => {
          const labels = await PageObjects.visualize.getXAxisLabels();
          log.debug(`Labels: ${labels}`);
          return labels.toString() === [ '10:00', '11:00', '12:00', '13:00', '14:00', '15:00' ].toString();
        });

        const expectedTableData = [ [ '09:05', '13', '13,463,070,562.462' ],
          [ '09:10', '23', '11,518,321,384.727' ],
          [ '09:15', '24', '12,437,509,461.333' ],
          [ '09:20', '30', '14,439,976,253.793' ],
          [ '09:25', '23', '11,017,524,802.783' ],
          [ '09:30', '30', '10,774,443,820.138' ],
          [ '09:35', '25', '10,565,619,548.16' ],
          [ '09:40', '21', '16,412,910,738.286' ],
          [ '09:45', '21', '13,207,024,435.2' ],
          [ '09:50', '26', '12,091,266,626.783' ],
          [ '09:55', '11', '8,882,773,271.273' ],
          [ '10:00', '17', '15,367,929,856' ],
          [ '10:05', '17', '10,990,063,375.059' ],
          [ '10:10', '11', '12,884,901,888' ],
          [ '10:15', '14', '10,200,547,328' ],
          [ '10:20', '21', '12,240,656,793.6' ],
          [ '10:25', '10', '10,737,418,240' ],
          [ '10:30', '12', '10,111,068,842.667' ],
          [ '10:35', '10', '11,381,663,334.4' ],
          [ '10:40', '14', '11,657,768,374.857' ]
        ];
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
        log.debug('set \'dateFormat:tz\': \'UTC\'');
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC', 'defaultIndex': 'logstash-*' });
        // We set the tz from 'America/Phoenix' to UTC and refreshing the browser but not re-entering
        // the absolute time range so the timepicker is going to shift +7 hours.
        await browser.refresh();
        // wait some time before trying to check for rendering count
        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.visualize.waitForRenderingCount();
        log.debug('getXAxisLabels');

        await retry.waitFor('wait for x-axis labels to match expected for UTC', async () => {
          const labels2 = await PageObjects.visualize.getXAxisLabels();
          log.debug(`Labels: ${labels2}`);
          return labels2.toString() === [ '17:00', '18:00', '19:00', '20:00', '21:00', '22:00' ].toString();
        });

        // the expected inspector data is the same but with timestamps shifted +7 hours
        const expectedTableData2 = [ [ '16:05', '13', '13,463,070,562.462' ],
          [ '16:10', '23', '11,518,321,384.727' ],
          [ '16:15', '24', '12,437,509,461.333' ],
          [ '16:20', '30', '14,439,976,253.793' ],
          [ '16:25', '23', '11,017,524,802.783' ],
          [ '16:30', '30', '10,774,443,820.138' ],
          [ '16:35', '25', '10,565,619,548.16' ],
          [ '16:40', '21', '16,412,910,738.286' ],
          [ '16:45', '21', '13,207,024,435.2' ],
          [ '16:50', '26', '12,091,266,626.783' ],
          [ '16:55', '11', '8,882,773,271.273' ],
          [ '17:00', '17', '15,367,929,856' ],
          [ '17:05', '17', '10,990,063,375.059' ],
          [ '17:10', '11', '12,884,901,888' ],
          [ '17:15', '14', '10,200,547,328' ],
          [ '17:20', '21', '12,240,656,793.6' ],
          [ '17:25', '10', '10,737,418,240' ],
          [ '17:30', '12', '10,111,068,842.667' ],
          [ '17:35', '10', '11,381,663,334.4' ],
          [ '17:40', '14', '11,657,768,374.857' ]
        ];
        await inspector.open();
        await inspector.expectTableData(expectedTableData2);
        log.debug('close inspector');
        await inspector.close();
      });

    });
  });
}
