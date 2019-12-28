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
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const renderable = getService('renderable');
  const PageObjects = getPageObjects(['common', 'visualize', 'visEditor', 'header']);

  describe.skip('data table with index without time filter', function indexPatternCreation() {
    const vizName1 = 'Visualization DataTable without time filter';

    before(async function() {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch(
        PageObjects.visualize.index.LOGSTASH_NON_TIME_BASED
      );
      log.debug('Bucket = Split Rows');
      await PageObjects.visEditor.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visEditor.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await PageObjects.visEditor.selectField('bytes');
      log.debug('Interval = 2000');
      await PageObjects.visEditor.setNumericInterval('2000');
      await PageObjects.visEditor.clickGo();
    });

    it('should allow applying changed params', async () => {
      await PageObjects.visEditor.setNumericInterval('1', true);
      const interval = await PageObjects.visEditor.getNumericInterval();
      expect(interval).to.be('20001');
      const isApplyButtonEnabled = await PageObjects.visEditor.isApplyEnabled();
      expect(isApplyButtonEnabled).to.be(true);
    });

    it('should allow reseting changed params', async () => {
      await PageObjects.visEditor.clickReset();
      const interval = await PageObjects.visEditor.getNumericInterval();
      expect(interval).to.be('2000');
    });

    it('should be able to save and load', async function() {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visChart.waitForVisualization();
    });

    it('should have inspector enabled', async function() {
      await inspector.expectIsEnabled();
    });

    it('should show correct data', function() {
      const expectedChartData = [
        ['0B', '2,088'],
        ['1.953KB', '2,748'],
        ['3.906KB', '2,707'],
        ['5.859KB', '2,876'],
        ['7.813KB', '2,863'],
        ['9.766KB', '147'],
        ['11.719KB', '148'],
        ['13.672KB', '129'],
        ['15.625KB', '161'],
        ['17.578KB', '137'],
      ];

      return retry.try(async function() {
        await inspector.open();
        await inspector.expectTableData(expectedChartData);
        await inspector.close();
      });
    });

    it('should show correct data when using average pipeline aggregation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch(
        PageObjects.visualize.index.LOGSTASH_NON_TIME_BASED
      );
      await PageObjects.visEditor.clickBucket('Metric', 'metrics');
      await PageObjects.visEditor.selectAggregation('Average Bucket', 'metrics');
      await PageObjects.visEditor.selectAggregation('Terms', 'metrics', 'buckets');
      await PageObjects.visEditor.selectField('geo.src', 'metrics', 'buckets');
      await PageObjects.visEditor.clickGo();
      const data = await PageObjects.visChart.getTableVisData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.be.eql(['14,004 1,412.6']);
    });

    it('should show correct data for a data table with date histogram', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch(
        PageObjects.visualize.index.LOGSTASH_NON_TIME_BASED
      );
      await PageObjects.visEditor.clickBucket('Split rows');
      await PageObjects.visEditor.selectAggregation('Date Histogram');
      await PageObjects.visEditor.selectField('@timestamp');
      await PageObjects.visEditor.setInterval('Daily');
      await PageObjects.visEditor.clickGo();
      const data = await PageObjects.visChart.getTableVisData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20',
        '4,757',
        '2015-09-21',
        '4,614',
        '2015-09-22',
        '4,633',
      ]);
    });

    it('should show correct data for a data table with date histogram', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch(
        PageObjects.visualize.index.LOGSTASH_NON_TIME_BASED
      );
      await PageObjects.visEditor.clickBucket('Split rows');
      await PageObjects.visEditor.selectAggregation('Date Histogram');
      await PageObjects.visEditor.selectField('@timestamp');
      await PageObjects.visEditor.setInterval('Daily');
      await PageObjects.visEditor.clickGo();
      const data = await PageObjects.visChart.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20',
        '4,757',
        '2015-09-21',
        '4,614',
        '2015-09-22',
        '4,633',
      ]);
    });

    it('should correctly filter for applied time filter on the main timefield', async () => {
      await filterBar.addFilter('@timestamp', 'is between', '2015-09-19', '2015-09-21');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      const data = await PageObjects.visChart.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql(['2015-09-20', '4,757']);
    });

    it('should correctly filter for pinned filters', async () => {
      await filterBar.toggleFilterPinned('@timestamp');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      const data = await PageObjects.visChart.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql(['2015-09-20', '4,757']);
    });
  });
}
