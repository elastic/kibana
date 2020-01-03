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
  const filterBar = getService('filterBar');
  const pieChart = getService('pieChart');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'header',
    'settings',
    'timePicker',
  ]);

  describe('pie chart', function() {
    const vizName1 = 'Visualization PieChart';
    before(async function() {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickPieChart');
      await PageObjects.visualize.clickPieChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('select bucket Split slices');
      await PageObjects.visEditor.clickBucket('Split slices');
      log.debug('Click aggregation Histogram');
      await PageObjects.visEditor.selectAggregation('Histogram');
      log.debug('Click field memory');
      await PageObjects.visEditor.selectField('memory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(1003);
      log.debug('setNumericInterval 4000');
      await PageObjects.visEditor.setInterval('40000', { type: 'numeric' });
      log.debug('clickGo');
      await PageObjects.visEditor.clickGo();
    });

    it('should save and load', async function() {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visChart.waitForVisualization();
    });

    it('should have inspector enabled', async function() {
      await inspector.expectIsEnabled();
    });

    it('should show 10 slices in pie chart', async function() {
      pieChart.expectPieSliceCount(10);
    });

    it('should show correct data', async function() {
      const expectedTableData = [
        ['0', '55'],
        ['40,000', '50'],
        ['80,000', '41'],
        ['120,000', '43'],
        ['160,000', '44'],
        ['200,000', '40'],
        ['240,000', '46'],
        ['280,000', '39'],
        ['320,000', '40'],
        ['360,000', '47'],
      ];

      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    });

    describe('other bucket', () => {
      it('should show other and missing bucket', async function() {
        const expectedTableData = ['win 8', 'win xp', 'win 7', 'ios', 'Missing', 'Other'];

        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        log.debug('select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Terms');
        await PageObjects.visEditor.selectAggregation('Terms');
        log.debug('Click field machine.os.raw');
        await PageObjects.visEditor.selectField('machine.os.raw');
        await PageObjects.visEditor.toggleOtherBucket(2);
        await PageObjects.visEditor.toggleMissingBucket(2);
        log.debug('clickGo');
        await PageObjects.visEditor.clickGo();
        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should apply correct filter on other bucket', async () => {
        const expectedTableData = ['Missing', 'osx'];

        await pieChart.filterOnPieSlice('Other');
        await PageObjects.visChart.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('machine.os.raw');
        await PageObjects.visChart.waitForVisualization();
      });

      it('should apply correct filter on other bucket by clicking on a legend', async () => {
        const expectedTableData = ['Missing', 'osx'];

        await PageObjects.visChart.filterLegend('Other');
        await PageObjects.visChart.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('machine.os.raw');
        await PageObjects.visChart.waitForVisualization();
      });

      it('should show two levels of other buckets', async () => {
        const expectedTableData = [
          'win 8',
          'CN',
          'IN',
          'US',
          'ID',
          'BR',
          'Other',
          'win xp',
          'CN',
          'IN',
          'US',
          'ID',
          'BR',
          'Other',
          'win 7',
          'CN',
          'IN',
          'US',
          'ID',
          'BR',
          'Other',
          'ios',
          'IN',
          'CN',
          'US',
          'ID',
          'BR',
          'Other',
          'Missing',
          'CN',
          'IN',
          'US',
          'BR',
          'PK',
          'Other',
          'Other',
          'IN',
          'CN',
          'US',
          'ID',
          'BR',
          'Other',
        ];

        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split slices');
        await PageObjects.visEditor.selectAggregation('Terms');
        log.debug('Click field geo.src');
        await PageObjects.visEditor.selectField('geo.src');
        await PageObjects.visEditor.toggleOtherBucket(3);
        await PageObjects.visEditor.toggleMissingBucket(3);
        log.debug('clickGo');
        await PageObjects.visEditor.clickGo();
        await pieChart.expectPieChartLabels(expectedTableData);
      });
    });

    describe('disabled aggs', () => {
      before(async () => {
        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visChart.waitForRenderingCount();
      });

      it('should show correct result with one agg disabled', async () => {
        const expectedTableData = ['win 8', 'win xp', 'win 7', 'ios', 'osx'];

        await PageObjects.visEditor.clickBucket('Split slices');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('machine.os.raw');
        await PageObjects.visEditor.toggleDisabledAgg(2);
        await PageObjects.visEditor.clickGo();

        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should correctly save disabled agg', async () => {
        await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visChart.waitForRenderingCount();

        const expectedTableData = ['win 8', 'win xp', 'win 7', 'ios', 'osx'];
        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should show correct result when agg is re-enabled', async () => {
        await PageObjects.visEditor.toggleDisabledAgg(2);
        await PageObjects.visEditor.clickGo();

        const expectedTableData = [
          '0',
          'win 7',
          'win xp',
          'win 8',
          'ios',
          'osx',
          '40,000',
          'win 8',
          'ios',
          'win 7',
          'win xp',
          'osx',
          '80,000',
          'win 7',
          'win 8',
          'osx',
          'win xp',
          'ios',
          '120,000',
          'ios',
          'win xp',
          'win 7',
          'win 8',
          'osx',
          '160,000',
          'win 8',
          'ios',
          'win 7',
          'win xp',
          'osx',
          '200,000',
          'win 8',
          'ios',
          'win xp',
          'win 7',
          'osx',
          '240,000',
          'ios',
          'win 7',
          'win xp',
          'win 8',
          'osx',
          '280,000',
          'win xp',
          'win 8',
          'win 7',
          'ios',
          'osx',
          '320,000',
          'win xp',
          'win 7',
          'ios',
          'win 8',
          'osx',
          '360,000',
          'win 7',
          'win xp',
          'ios',
          'win 8',
          'osx',
        ];

        await pieChart.expectPieChartLabels(expectedTableData);
      });
    });

    describe('empty time window', () => {
      it('should show no data message when no data on selected timerange', async function() {
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        log.debug('select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Filters');
        await PageObjects.visEditor.selectAggregation('Filters');
        log.debug('Set the 1st filter value');
        await PageObjects.visEditor.setFilterAggregationValue('geo.dest:"US"');
        log.debug('Add new filter');
        await PageObjects.visEditor.addNewFilterAggregation();
        log.debug('Set the 2nd filter value');
        await PageObjects.visEditor.setFilterAggregationValue('geo.dest:"CN"', 1);
        await PageObjects.visEditor.clickGo();
        const emptyFromTime = 'Sep 19, 2016 @ 06:31:44.000';
        const emptyToTime = 'Sep 23, 2016 @ 18:31:44.000';
        log.debug(
          'Switch to a different time range from "' + emptyFromTime + '" to "' + emptyToTime + '"'
        );
        await PageObjects.timePicker.setAbsoluteRange(emptyFromTime, emptyToTime);
        await PageObjects.visChart.waitForVisualization();
        await PageObjects.visChart.expectError();
      });
    });
    describe('multi series slice', () => {
      before(async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        log.debug(
          'Set absolute time range from "' +
            PageObjects.timePicker.defaultStartTime +
            '" to "' +
            PageObjects.timePicker.defaultEndTime +
            '"'
        );
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        log.debug('select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Histogram');
        await PageObjects.visEditor.selectAggregation('Histogram');
        log.debug('Click field memory');
        await PageObjects.visEditor.selectField('memory');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.common.sleep(1003);
        log.debug('setNumericInterval 4000');
        await PageObjects.visEditor.setInterval('40000', { type: 'numeric' });
        log.debug('Toggle previous editor');
        await PageObjects.visEditor.toggleAggregationEditor(2);
        log.debug('select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('geo.dest');
        await PageObjects.visEditor.clickGo();
      });

      it('should show correct chart', async () => {
        const expectedTableData = [
          ['0', '55', 'CN', '14'],
          ['0', '55', 'IN', '9'],
          ['0', '55', 'MX', '3'],
          ['0', '55', 'US', '3'],
          ['0', '55', 'BR', '2'],
          ['40,000', '50', 'CN', '7'],
          ['40,000', '50', 'IN', '7'],
          ['40,000', '50', 'US', '5'],
          ['40,000', '50', 'MY', '3'],
          ['40,000', '50', 'ET', '2'],
          ['80,000', '41', 'CN', '9'],
          ['80,000', '41', 'IN', '4'],
          ['80,000', '41', 'US', '4'],
          ['80,000', '41', 'BR', '3'],
          ['80,000', '41', 'IT', '2'],
          ['120,000', '43', 'CN', '8'],
          ['120,000', '43', 'IN', '5'],
          ['120,000', '43', 'US', '4'],
          ['120,000', '43', 'JP', '3'],
          ['120,000', '43', 'RU', '3'],
          ['160,000', '44', 'CN', '15'],
          ['160,000', '44', 'IN', '5'],
          ['160,000', '44', 'IQ', '2'],
          ['160,000', '44', 'JP', '2'],
          ['160,000', '44', 'NG', '2'],
          ['200,000', '40', 'IN', '7'],
          ['200,000', '40', 'CN', '6'],
          ['200,000', '40', 'MX', '3'],
          ['200,000', '40', 'BR', '2'],
          ['200,000', '40', 'ID', '2'],
          ['240,000', '46', 'CN', '6'],
          ['240,000', '46', 'IN', '6'],
          ['240,000', '46', 'US', '6'],
          ['240,000', '46', 'NG', '3'],
          ['240,000', '46', 'CH', '2'],
          ['280,000', '39', 'CN', '11'],
          ['280,000', '39', 'IN', '5'],
          ['280,000', '39', 'BR', '2'],
          ['280,000', '39', 'IT', '2'],
          ['280,000', '39', 'NG', '2'],
          ['320,000', '40', 'CN', '7'],
          ['320,000', '40', 'US', '6'],
          ['320,000', '40', 'MX', '4'],
          ['320,000', '40', 'BD', '2'],
          ['320,000', '40', 'ID', '2'],
          ['360,000', '47', 'IN', '8'],
          ['360,000', '47', 'CN', '6'],
          ['360,000', '47', 'US', '4'],
          ['360,000', '47', 'BD', '3'],
          ['360,000', '47', 'BR', '2'],
        ];

        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it('should correctly filter on legend', async () => {
        const expectedTableData = [
          '0',
          'CN',
          '40,000',
          'CN',
          '80,000',
          'CN',
          '120,000',
          'CN',
          '160,000',
          'CN',
          '200,000',
          'CN',
          '240,000',
          'CN',
          '280,000',
          'CN',
          '320,000',
          'CN',
          '360,000',
          'CN',
        ];
        await PageObjects.visChart.filterLegend('CN');
        await PageObjects.visChart.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('geo.dest');
        await PageObjects.visChart.waitForVisualization();
      });

      it('should still showing pie chart when a subseries have zero data', async function() {
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        log.debug('select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Filters');
        await PageObjects.visEditor.selectAggregation('Filters');
        log.debug('Set the 1st filter value');
        await PageObjects.visEditor.setFilterAggregationValue('geo.dest:"US"');
        log.debug('Toggle previous editor');
        await PageObjects.visEditor.toggleAggregationEditor(2);
        log.debug('Add a new series, select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Filters');
        await PageObjects.visEditor.selectAggregation('Filters');
        log.debug('Set the 1st filter value of the aggregation id 3');
        await PageObjects.visEditor.setFilterAggregationValue('geo.dest:"UX"', 0, 3);
        await PageObjects.visEditor.clickGo();
        const legends = await PageObjects.visChart.getLegendEntries();
        const expectedLegends = ['geo.dest:"US"', 'geo.dest:"UX"'];
        expect(legends).to.eql(expectedLegends);
      });
    });

    describe('split chart', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        log.debug('select bucket Split chart');
        await PageObjects.visEditor.clickBucket('Split chart');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('machine.os.raw');
        await PageObjects.visEditor.toggleAggregationEditor(2);
        log.debug('Add a new series, select bucket Split slices');
        await PageObjects.visEditor.clickBucket('Split slices');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('geo.src');
        await PageObjects.visEditor.clickGo();
      });

      it('shows correct split chart', async () => {
        const expectedTableData = [
          ['win 8', '2,904', 'CN', '560'],
          ['win 8', '2,904', 'IN', '489'],
          ['win 8', '2,904', 'US', '223'],
          ['win 8', '2,904', 'ID', '100'],
          ['win 8', '2,904', 'BR', '89'],
          ['win xp', '2,858', 'CN', '526'],
          ['win xp', '2,858', 'IN', '467'],
          ['win xp', '2,858', 'US', '250'],
          ['win xp', '2,858', 'ID', '98'],
          ['win xp', '2,858', 'BR', '84'],
          ['win 7', '2,814', 'CN', '537'],
          ['win 7', '2,814', 'IN', '460'],
          ['win 7', '2,814', 'US', '260'],
          ['win 7', '2,814', 'ID', '102'],
          ['win 7', '2,814', 'BR', '74'],
          ['ios', '2,784', 'IN', '494'],
          ['ios', '2,784', 'CN', '478'],
          ['ios', '2,784', 'US', '222'],
          ['ios', '2,784', 'ID', '96'],
          ['ios', '2,784', 'BR', '84'],
          ['osx', '1,322', 'IN', '242'],
          ['osx', '1,322', 'CN', '228'],
          ['osx', '1,322', 'US', '130'],
          ['osx', '1,322', 'ID', '56'],
          ['osx', '1,322', 'BR', '30'],
        ];
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it('correctly applies filter', async () => {
        const expectedTableData = [
          ['win 8', '560', 'CN', '560'],
          ['win 7', '537', 'CN', '537'],
          ['win xp', '526', 'CN', '526'],
          ['ios', '478', 'CN', '478'],
          ['osx', '228', 'CN', '228'],
        ];
        await PageObjects.visChart.filterLegend('CN');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });
    });
  });
}
