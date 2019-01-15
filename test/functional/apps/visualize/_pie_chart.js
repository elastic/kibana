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
  const log = getService('log');
  const filterBar = getService('filterBar');
  const pieChart = getService('pieChart');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('pie chart', async function () {
    const vizName1 = 'Visualization PieChart';
    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickPieChart');
      await PageObjects.visualize.clickPieChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('select bucket Split Slices');
      await PageObjects.visualize.clickBucket('Split Slices');
      log.debug('Click aggregation Histogram');
      await PageObjects.visualize.selectAggregation('Histogram');
      log.debug('Click field memory');
      await PageObjects.visualize.selectField('memory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(1003);
      log.debug('setNumericInterval 4000');
      await PageObjects.visualize.setNumericInterval('40000');
      log.debug('clickGo');
      await PageObjects.visualize.clickGo();
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.visualize.waitForVisualizationSavedToastGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });


    it('should show 10 slices in pie chart', async function () {
      pieChart.expectPieSliceCount(10);
    });

    it('should show correct data', async function () {
      const expectedTableData =  [['0', '55'], ['40,000', '50'], ['80,000', '41'], ['120,000', '43'],
        ['160,000', '44'], ['200,000', '40'], ['240,000', '46'], ['280,000', '39'], ['320,000', '40'], ['360,000', '47']
      ];

      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    });

    describe('other bucket', () => {
      it('should show other and missing bucket', async function () {
        const expectedTableData = [ 'win 8', 'win xp', 'win 7', 'ios', 'Missing', 'Other' ];

        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        log.debug(`Set absolute time range from "${fromTime}" to "${toTime}"`);
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        log.debug('select bucket Split Slices');
        await PageObjects.visualize.clickBucket('Split Slices');
        log.debug('Click aggregation Terms');
        await PageObjects.visualize.selectAggregation('Terms');
        log.debug('Click field machine.os.raw');
        await PageObjects.visualize.selectField('machine.os.raw');
        await PageObjects.visualize.toggleOtherBucket();
        await PageObjects.visualize.toggleMissingBucket();
        log.debug('clickGo');
        await PageObjects.visualize.clickGo();
        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should apply correct filter on other bucket', async () => {
        const expectedTableData = [ 'Missing', 'osx' ];

        await PageObjects.header.waitUntilLoadingHasFinished();
        await pieChart.filterOnPieSlice('Other');
        await PageObjects.visualize.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('machine.os.raw');
        await PageObjects.visualize.waitForVisualization();
      });

      it('should apply correct filter on other bucket by clicking on a legend', async () => {
        const expectedTableData = [ 'Missing', 'osx' ];

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.filterLegend('Other');
        await PageObjects.visualize.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('machine.os.raw');
        await PageObjects.visualize.waitForVisualization();
      });

      it('should show two levels of other buckets', async () => {
        const expectedTableData = [ 'win 8', 'CN', 'IN', 'US', 'ID', 'BR', 'Other', 'win xp',
          'CN', 'IN', 'US', 'ID', 'BR', 'Other', 'win 7', 'CN', 'IN', 'US', 'ID', 'BR', 'Other',
          'ios', 'IN', 'CN', 'US', 'ID', 'BR', 'Other', 'Missing', 'CN', 'IN', 'US', 'BR', 'PK',
          'Other', 'Other', 'IN', 'CN', 'US', 'ID', 'BR', 'Other' ];

        await PageObjects.visualize.toggleOpenEditor(2, 'false');
        await PageObjects.visualize.clickAddBucket();
        await PageObjects.visualize.clickBucket('Split Slices');
        await PageObjects.visualize.selectAggregation('Terms');
        log.debug('Click field geo.src');
        await PageObjects.visualize.selectField('geo.src');
        await PageObjects.visualize.toggleOtherBucket();
        await PageObjects.visualize.toggleMissingBucket();
        log.debug('clickGo');
        await PageObjects.visualize.clickGo();
        await pieChart.expectPieChartLabels(expectedTableData);
      });
    });

    describe('disabled aggs', () => {
      before(async () => {
        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visualize.waitForVisualization();
        // sleep a bit before trying to get the pie chart data below
        await PageObjects.common.sleep(2000);
      });

      it('should show correct result with one agg disabled', async () => {
        const expectedTableData =  [ 'win 8', 'win xp', 'win 7', 'ios', 'osx'  ];

        await PageObjects.visualize.clickAddBucket();
        await PageObjects.visualize.clickBucket('Split Slices');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('machine.os.raw');
        await PageObjects.visualize.toggleDisabledAgg(2);
        await PageObjects.visualize.clickGo();

        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should correctly save disabled agg', async () => {
        await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);
        const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
        log.debug(`Save viz page title is ${pageTitle}`);
        expect(pageTitle).to.contain(vizName1);
        await PageObjects.visualize.waitForVisualizationSavedToastGone();
        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visualize.waitForVisualization();

        const expectedTableData =  [ 'win 8', 'win xp', 'win 7', 'ios', 'osx'  ];
        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should show correct result when agg is re-enabled', async () => {
        await PageObjects.visualize.toggleDisabledAgg(2);
        await PageObjects.visualize.clickGo();

        const expectedTableData =  [
          '0', 'win 7', 'win xp', 'win 8', 'ios', 'osx', '40,000', 'win 8', 'ios', 'win 7', 'win xp', 'osx', '80,000',
          'win 7', 'win 8', 'osx', 'win xp', 'ios', '120,000', 'ios', 'win xp', 'win 7', 'win 8', 'osx', '160,000',
          'win 8', 'ios', 'win 7', 'win xp', 'osx', '200,000', 'win 8', 'ios', 'win xp', 'win 7', 'osx', '240,000',
          'ios', 'win 7', 'win xp', 'win 8', 'osx', '280,000', 'win xp', 'win 8', 'win 7', 'ios', 'osx', '320,000',
          'win xp', 'win 7', 'ios', 'win 8', 'osx', '360,000', 'win 7', 'win xp', 'ios', 'win 8', 'osx' ];

        await pieChart.expectPieChartLabels(expectedTableData);
      });
    });

    describe('empty time window', () => {
      it('should show no data message when no data on selected timerange', async function () {
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        log.debug('select bucket Split Slices');
        await PageObjects.visualize.clickBucket('Split Slices');
        log.debug('Click aggregation Filters');
        await PageObjects.visualize.selectAggregation('Filters');
        log.debug('Set the 1st filter value');
        await PageObjects.visualize.setFilterAggregationValue('geo.dest:"US"');
        log.debug('Add new filter');
        await PageObjects.visualize.addNewFilterAggregation();
        log.debug('Set the 2nd filter value');
        await PageObjects.visualize.setFilterAggregationValue('geo.dest:"CN"', 1);
        await PageObjects.visualize.clickGo();
        const emptyFromTime = '2016-09-19 06:31:44.000';
        const emptyToTime = '2016-09-23 18:31:44.000';
        log.debug('Switch to a different time range from \"' + emptyFromTime + '\" to \"' + emptyToTime + '\"');
        await PageObjects.header.setAbsoluteRange(emptyFromTime, emptyToTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.expectError();
      });
    });
    describe('multi series slice', () => {
      it('should still showing pie chart when a subseries have zero data', async function () {
        await PageObjects.visualize.navigateToNewVisualization();
        log.debug('clickPieChart');
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        log.debug('select bucket Split Slices');
        await PageObjects.visualize.clickBucket('Split Slices');
        log.debug('Click aggregation Filters');
        await PageObjects.visualize.selectAggregation('Filters');
        log.debug('Set the 1st filter value');
        await PageObjects.visualize.setFilterAggregationValue('geo.dest:"US"');
        log.debug('Toggle previous editor');
        await PageObjects.visualize.toggleAggregationEditor(2);
        log.debug('Add a new series');
        await PageObjects.visualize.clickAddBucket();
        log.debug('select bucket Split Slices');
        await PageObjects.visualize.clickBucket('Split Slices');
        log.debug('Click aggregation Filters');
        await PageObjects.visualize.selectAggregation('Filters');
        log.debug('Set the 1st filter value of the aggregation id 3');
        await PageObjects.visualize.setFilterAggregationValue('geo.dest:"UX"', 0, 3);
        await PageObjects.visualize.clickGo();
        const legends = await PageObjects.visualize.getLegendEntries();
        const expectedLegends = ['geo.dest:"US"', 'geo.dest:"UX"'];
        expect(legends).to.eql(expectedLegends);
      });
    });

    describe('split chart', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        log.debug('select bucket Split Slices');
        await PageObjects.visualize.clickBucket('Split Chart');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('machine.os.raw');
        await PageObjects.visualize.toggleAggregationEditor(2);
        log.debug('Add a new series');
        await PageObjects.visualize.clickAddBucket();
        log.debug('select bucket Split Slices');
        await PageObjects.visualize.clickBucket('Split Slices');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('geo.src');
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.waitForVisualization();
      });

      it ('shows correct split chart', async () => {
        const expectedTableData =  [
          [ 'win 8', '2,904', 'CN', '560' ],
          [ 'win 8', '2,904', 'IN', '489' ],
          [ 'win 8', '2,904', 'US', '223' ],
          [ 'win 8', '2,904', 'ID', '100' ],
          [ 'win 8', '2,904', 'BR', '89' ],
          [ 'win xp', '2,858', 'CN', '526' ],
          [ 'win xp', '2,858', 'IN', '467' ],
          [ 'win xp', '2,858', 'US', '250' ],
          [ 'win xp', '2,858', 'ID', '98' ],
          [ 'win xp', '2,858', 'BR', '84' ],
          [ 'win 7', '2,814', 'CN', '537' ],
          [ 'win 7', '2,814', 'IN', '460' ],
          [ 'win 7', '2,814', 'US', '260' ],
          [ 'win 7', '2,814', 'ID', '102' ],
          [ 'win 7', '2,814', 'BR', '74' ],
          [ 'ios', '2,784', 'IN', '494' ],
          [ 'ios', '2,784', 'CN', '478' ],
          [ 'ios', '2,784', 'US', '222' ],
          [ 'ios', '2,784', 'ID', '96' ],
          [ 'ios', '2,784', 'BR', '84' ],
          [ 'osx', '1,322', 'IN', '242' ],
          [ 'osx', '1,322', 'CN', '228' ],
          [ 'osx', '1,322', 'US', '130' ],
          [ 'osx', '1,322', 'ID', '56' ],
          [ 'osx', '1,322', 'BR', '30' ]
        ];
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it ('correctly applies filter', async () => {
        const expectedTableData = [[ 'win 8', '560', 'CN', '560' ]];
        await PageObjects.visualize.filterLegend('CN');
        await PageObjects.visualize.applyFilters();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });
    });
  });
}
