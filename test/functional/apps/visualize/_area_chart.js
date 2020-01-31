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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const inspector = getService('inspector');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings', 'timePicker']);

  describe('area charts', function indexPatternCreation() {
    const vizName1 = 'Visualization AreaChart Name Test';

    const initAreaChart = async () => {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickAreaChart');
      await PageObjects.visualize.clickAreaChart();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      log.debug('Click X-axis');
      await PageObjects.visualize.clickBucket('X-axis');
      log.debug('Click Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Check field value');
      const fieldValues = await PageObjects.visualize.getField();
      log.debug('fieldValue = ' + fieldValues);
      expect(fieldValues[0]).to.be('@timestamp');
      const intervalValue = await PageObjects.visualize.getInterval();
      log.debug('intervalValue = ' + intervalValue);
      expect(intervalValue[0]).to.be('Auto');
      return PageObjects.visualize.clickGo();
    };

    before(initAreaChart);

    it('should save and load with special characters', async function() {
      const vizNamewithSpecialChars = vizName1 + '/?&=%';
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(
        vizNamewithSpecialChars
      );
    });

    it('should save and load with non-ascii characters', async function() {
      const vizNamewithSpecialChars = `${vizName1} with Umlaut ä`;
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(
        vizNamewithSpecialChars
      );
    });

    it('should save and load', async function() {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function() {
      await inspector.expectIsEnabled();
    });

    it('should show correct chart', async function() {
      const xAxisLabels = [
        '2015-09-20 00:00',
        '2015-09-21 00:00',
        '2015-09-22 00:00',
        '2015-09-23 00:00',
      ];
      const yAxisLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600'];
      const expectedAreaChartData = [
        37,
        202,
        740,
        1437,
        1371,
        751,
        188,
        31,
        42,
        202,
        683,
        1361,
        1415,
        707,
        177,
        27,
        32,
        175,
        707,
        1408,
        1355,
        726,
        201,
        29,
      ];

      await retry.try(async function tryingForTime() {
        const labels = await PageObjects.visualize.getXAxisLabels();
        log.debug('X-Axis labels = ' + labels);
        expect(labels).to.eql(xAxisLabels);
      });
      const labels = await PageObjects.visualize.getYAxisLabels();
      log.debug('Y-Axis labels = ' + labels);
      expect(labels).to.eql(yAxisLabels);
      const paths = await PageObjects.visualize.getAreaChartData('Count');
      log.debug('expectedAreaChartData = ' + expectedAreaChartData);
      log.debug('actual chart data =     ' + paths);
      expect(paths).to.eql(expectedAreaChartData);
    });

    it('should show correct data', async function() {
      const expectedTableData = [
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
        ['2015-09-22 12:00', '1,355'],
        ['2015-09-22 15:00', '726'],
        ['2015-09-22 18:00', '201'],
        ['2015-09-22 21:00', '29'],
      ];

      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
      await inspector.close();
    });

    describe('axis scaling', () => {
      it.skip('does not scale by default', async () => {
        const expectedTableData = [
          ['2015-09-20 00:00', '6'],
          ['2015-09-20 01:00', '9'],
          ['2015-09-20 02:00', '22'],
          ['2015-09-20 03:00', '31'],
          ['2015-09-20 04:00', '52'],
          ['2015-09-20 05:00', '119'],
          ['2015-09-20 06:00', '181'],
          ['2015-09-20 07:00', '218'],
          ['2015-09-20 08:00', '341'],
          ['2015-09-20 09:00', '440'],
          ['2015-09-20 10:00', '480'],
          ['2015-09-20 11:00', '517'],
          ['2015-09-20 12:00', '522'],
          ['2015-09-20 13:00', '446'],
          ['2015-09-20 14:00', '403'],
          ['2015-09-20 15:00', '321'],
          ['2015-09-20 16:00', '258'],
          ['2015-09-20 17:00', '172'],
          ['2015-09-20 18:00', '95'],
          ['2015-09-20 19:00', '55'],
        ];

        await PageObjects.visualize.toggleOpenEditor(2);
        await PageObjects.visualize.setInterval('Second');
        await PageObjects.visualize.clickGo();
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it.skip('scales when enabled count agg', async () => {
        const expectedTableData = [
          ['2015-09-20 00:00', '0.002'],
          ['2015-09-20 01:00', '0.003'],
          ['2015-09-20 02:00', '0.006'],
          ['2015-09-20 03:00', '0.009'],
          ['2015-09-20 04:00', '0.014'],
          ['2015-09-20 05:00', '0.033'],
          ['2015-09-20 06:00', '0.05'],
          ['2015-09-20 07:00', '0.061'],
          ['2015-09-20 08:00', '0.095'],
          ['2015-09-20 09:00', '0.122'],
          ['2015-09-20 10:00', '0.133'],
          ['2015-09-20 11:00', '0.144'],
          ['2015-09-20 12:00', '0.145'],
          ['2015-09-20 13:00', '0.124'],
          ['2015-09-20 14:00', '0.112'],
          ['2015-09-20 15:00', '0.089'],
          ['2015-09-20 16:00', '0.072'],
          ['2015-09-20 17:00', '0.048'],
          ['2015-09-20 18:00', '0.026'],
          ['2015-09-20 19:00', '0.015'],
        ];

        await PageObjects.visualize.toggleAdvancedParams('2');
        await PageObjects.visualize.toggleScaleMetrics();
        await PageObjects.visualize.clickGo();
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it.skip('does not scale top hit agg', async () => {
        const expectedTableData = [
          ['2015-09-20 00:00', '6', '9.035KB'],
          ['2015-09-20 01:00', '9', '5.854KB'],
          ['2015-09-20 02:00', '22', '4.588KB'],
          ['2015-09-20 03:00', '31', '8.349KB'],
          ['2015-09-20 04:00', '52', '2.637KB'],
          ['2015-09-20 05:00', '119', '1.712KB'],
          ['2015-09-20 06:00', '181', '9.157KB'],
          ['2015-09-20 07:00', '218', '8.192KB'],
          ['2015-09-20 08:00', '341', '12.384KB'],
          ['2015-09-20 09:00', '440', '4.482KB'],
          ['2015-09-20 10:00', '480', '9.449KB'],
          ['2015-09-20 11:00', '517', '213B'],
          ['2015-09-20 12:00', '522', '638B'],
          ['2015-09-20 13:00', '446', '7.421KB'],
          ['2015-09-20 14:00', '403', '4.854KB'],
          ['2015-09-20 15:00', '321', '4.132KB'],
          ['2015-09-20 16:00', '258', '601B'],
          ['2015-09-20 17:00', '172', '4.239KB'],
          ['2015-09-20 18:00', '95', '6.272KB'],
          ['2015-09-20 19:00', '55', '2.053KB'],
        ];

        await PageObjects.visualize.clickBucket('Y-axis', 'metrics');
        await PageObjects.visualize.selectAggregation('Top Hit', 'metrics');
        await PageObjects.visualize.selectField('bytes', 'metrics');
        await PageObjects.visualize.selectAggregateWith('average');
        await PageObjects.visualize.clickGo();
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });
    });

    describe('embedded mode', () => {
      it('should hide side editor if embed is set to true in url', async () => {
        const url = await browser.getCurrentUrl();
        const embedUrl = url
          .split('/visualize/')
          .pop()
          .replace('?_g=', '?embed=true&_g=');
        await PageObjects.common.navigateToUrl('visualize', embedUrl);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sideEditorExists = await PageObjects.visualize.getSideEditorExists();
        expect(sideEditorExists).to.be(false);
      });

      after(async () => {
        const url = await browser.getCurrentUrl();
        const embedUrl = url
          .split('/visualize/')
          .pop()
          .replace('?embed=true&', '?');
        await PageObjects.common.navigateToUrl('visualize', embedUrl);
      });
    });

    describe.skip('switch between Y axis scale types', () => {
      before(initAreaChart);
      const axisId = 'ValueAxis-1';

      it('should show ticks on selecting log scale', async () => {
        await PageObjects.visualize.clickMetricsAndAxes();
        await PageObjects.visualize.clickYAxisOptions(axisId);
        await PageObjects.visualize.selectYAxisScaleType(axisId, 'log');
        await PageObjects.visualize.clickYAxisAdvancedOptions(axisId);
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '2',
          '3',
          '5',
          '7',
          '10',
          '20',
          '30',
          '50',
          '70',
          '100',
          '200',
          '300',
          '500',
          '700',
          '1,000',
          '2,000',
          '3,000',
          '5,000',
          '7,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting log scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '2',
          '3',
          '5',
          '7',
          '10',
          '20',
          '30',
          '50',
          '70',
          '100',
          '200',
          '300',
          '500',
          '700',
          '1,000',
          '2,000',
          '3,000',
          '5,000',
          '7,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting square root scale', async () => {
        await PageObjects.visualize.selectYAxisScaleType(axisId, 'square root');
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '0',
          '200',
          '400',
          '600',
          '800',
          '1,000',
          '1,200',
          '1,400',
          '1,600',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = ['200', '400', '600', '800', '1,000', '1,200', '1,400'];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting linear scale', async () => {
        await PageObjects.visualize.selectYAxisScaleType(axisId, 'linear');
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        log.debug(labels);
        const expectedLabels = [
          '0',
          '200',
          '400',
          '600',
          '800',
          '1,000',
          '1,200',
          '1,400',
          '1,600',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = ['200', '400', '600', '800', '1,000', '1,200', '1,400'];
        expect(labels).to.eql(expectedLabels);
      });
    });
    describe('date histogram with long time range', () => {
      // that dataset spans from Oct 26, 2013 @ 06:10:17.855	to Apr 18, 2019 @ 11:38:12.790
      const fromTime = '2013-01-01 00:00:00.000';
      const toTime = '2020-01-01 00:00:00.000';
      it('should render a yearly area with 12 svg paths', async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickAreaChart');
        await PageObjects.visualize.clickAreaChart();
        log.debug('clickNewSearch');
        await PageObjects.visualize.clickNewSearch('long-window-logstash-*');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        log.debug('Click X-axis');
        await PageObjects.visualize.clickBucket('X-axis');
        log.debug('Click Date Histogram');
        await PageObjects.visualize.selectAggregation('Date Histogram');
        await PageObjects.visualize.selectField('@timestamp');
        await PageObjects.visualize.setInterval('Yearly');
        await PageObjects.visualize.clickGo();
        // This svg area is composed by 7 years (2013 - 2019).
        // 7 points are used to draw the upper line (usually called y1)
        // 7 points compose the lower line (usually called y0)
        const paths = await PageObjects.visualize.getAreaChartPaths('Count');
        log.debug('actual chart data =     ' + paths);
        const numberOfSegments = 7 * 2;
        expect(paths.length).to.eql(numberOfSegments);
      });
      it('should render monthly areas with 168 svg paths', async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickAreaChart');
        await PageObjects.visualize.clickAreaChart();
        log.debug('clickNewSearch');
        await PageObjects.visualize.clickNewSearch('long-window-logstash-*');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        log.debug('Click X-axis');
        await PageObjects.visualize.clickBucket('X-axis');
        log.debug('Click Date Histogram');
        await PageObjects.visualize.selectAggregation('Date Histogram');
        await PageObjects.visualize.selectField('@timestamp');
        await PageObjects.visualize.setInterval('Monthly');
        await PageObjects.visualize.clickGo();
        // This svg area is composed by 67 months 3 (2013) + 5 * 12 + 4 (2019)
        // 67 points are used to draw the upper line (usually called y1)
        // 67 points compose the lower line (usually called y0)
        const numberOfSegments = 67 * 2;
        const paths = await PageObjects.visualize.getAreaChartPaths('Count');
        log.debug('actual chart data =     ' + paths);
        expect(paths.length).to.eql(numberOfSegments);
      });
    });
  });
}
