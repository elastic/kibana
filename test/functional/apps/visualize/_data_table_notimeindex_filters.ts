/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const filterBar = getService('filterBar');
  const renderable = getService('renderable');
  const retry = getService('retry');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'header',
    'dashboard',
    'timePicker',
    'visEditor',
    'visChart',
  ]);

  describe('data table with index without time filter filters', function indexPatternCreation() {
    const vizName1 = 'Visualization DataTable w/o time filter';

    before(async function () {
      await PageObjects.visualize.initTests();
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
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
      await PageObjects.visEditor.setInterval('2000', { type: 'numeric' });
      await PageObjects.visEditor.clickGo();
    });

    it('should be able to save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visChart.waitForVisualization();
    });

    it('timefilter should be disabled', async () => {
      const isOff = await PageObjects.timePicker.isOff();
      expect(isOff).to.be(true);
    });

    // test to cover bug #54548 - add this visualization to a dashboard and filter
    it('should add to dashboard and allow filtering', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.addVisualization(vizName1);

      await retry.try(async () => {
        // hover and click on cell to filter
        await PageObjects.visChart.filterOnTableCell(0, 1);

        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.be(1);
      });

      await filterBar.removeAllFilters();
    });
  });
}
