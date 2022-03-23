/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

/**
 * Test the querying capabilities of dashboard, and make sure visualizations show the expected results, especially
 * with nested queries and filters on the visualizations themselves.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardExpect = getService('dashboardExpect');
  const pieChart = getService('pieChart');
  const queryBar = getService('queryBar');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const renderable = getService('renderable');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize', 'timePicker']);

  describe('dashboard filtering using ccs', function () {
    const populateDashboard = async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultDataRange();
      await dashboardAddPanel.addEveryVisualization('"Filter Bytes Test"');
      await dashboardAddPanel.addEverySavedSearch('"Filter Bytes Test"');

      await dashboardAddPanel.closeAddPanel();
    };

    const addFilterAndRefresh = async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await filterBar.addFilter('bytes', 'is', '12345678');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      // first round of requests sometimes times out, refresh all visualizations to fetch again
      await queryBar.clickQuerySubmitButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana_ccs'
      );
      // The kbn_archiver above was created from an es_archiver which intentionally had
      // 2 missing index patterns.  But that would fail to load with kbn_archiver.
      // So we unload those 2 index patterns here.
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana_unload_ccs'
      );

      await security.testUser.setRoles([
        'kibana_admin',
        'test_logstash_reader',
        'animals',
        'ccs_remote_search',
      ]);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('adding a filter that excludes all data', () => {
      before(async () => {
        await populateDashboard();
        await addFilterAndRefresh();
      });

      after(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('filters on pie charts', async () => {
        await pieChart.expectPieSliceCount(0);
      });

      it('area, bar and heatmap charts filtered', async () => {
        await dashboardExpect.seriesElementCount(0);
      });

      it('data tables are filtered', async () => {
        await dashboardExpect.dataTableNoResult();
      });

      it('goal and guages are filtered', async () => {
        await dashboardExpect.goalAndGuageLabelsExist(['0', '0%']);
      });

      it('tsvb time series shows no data message', async () => {
        expect(await testSubjects.exists('timeseriesVis > visNoResult')).to.be(true);
      });

      it('metric value shows no data', async () => {
        await dashboardExpect.metricValuesExist(['-']);
      });

      it('tag cloud values are filtered', async () => {
        await dashboardExpect.emptyTagCloudFound();
      });

      it('tsvb metric is filtered', async () => {
        await dashboardExpect.tsvbMetricValuesExist(['0 custom template']);
      });

      it('tsvb top n is filtered', async () => {
        await dashboardExpect.tsvbTopNValuesExist(['-', '-']);
      });

      it('saved search is filtered', async () => {
        await dashboardExpect.savedSearchRowsMissing();
      });

      it('timelion is filtered', async () => {
        await dashboardExpect.timelionLegendCount(0);
      });

      it('vega is filtered', async () => {
        await dashboardExpect.vegaTextsDoNotExist(['5,000']);
      });
    });

    describe('using a pinned filter that excludes all data', () => {
      before(async () => {
        // Functional tests clear session storage after each suite, so it is important to repopulate unsaved panels
        await populateDashboard();
        await addFilterAndRefresh();

        await filterBar.toggleFilterPinned('bytes');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
      });

      after(async () => {
        await filterBar.toggleFilterPinned('bytes');
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('filters on pie charts', async () => {
        await pieChart.expectPieSliceCount(0);
      });

      it('area, bar and heatmap charts filtered', async () => {
        await dashboardExpect.seriesElementCount(0);
      });

      it('data tables are filtered', async () => {
        await dashboardExpect.dataTableNoResult();
      });

      it('goal and guages are filtered', async () => {
        await dashboardExpect.goalAndGuageLabelsExist(['0', '0%']);
      });

      it('metric value shows no data', async () => {
        await dashboardExpect.metricValuesExist(['-']);
      });

      it('tag cloud values are filtered', async () => {
        await dashboardExpect.emptyTagCloudFound();
      });

      it('tsvb metric is filtered', async () => {
        await dashboardExpect.tsvbMetricValuesExist(['0 custom template']);
      });

      it('tsvb top n is filtered', async () => {
        await dashboardExpect.tsvbTopNValuesExist(['-', '-']);
      });

      it('saved search is filtered', async () => {
        await dashboardExpect.savedSearchRowsMissing();
      });

      it('timelion is filtered', async () => {
        await dashboardExpect.timelionLegendCount(0);
      });

      it('vega is filtered', async () => {
        await dashboardExpect.vegaTextsDoNotExist(['5,000']);
      });
    });

    describe('disabling a filter unfilters the data on', function () {
      before(async () => {
        // Functional tests clear session storage after each suite, so it is important to repopulate unsaved panels
        await populateDashboard();
        await addFilterAndRefresh();

        await filterBar.toggleFilterEnabled('bytes');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('pie charts', async () => {
        await pieChart.expectPieSliceCount(5);
      });

      it('area, bar and heatmap charts', async () => {
        await dashboardExpect.seriesElementCount(2);
      });

      it('data tables', async () => {
        await dashboardExpect.dataTableRowCount(10);
      });

      it('goal and guages', async () => {
        await dashboardExpect.goalAndGuageLabelsExist(['39.958%', '7,544']);
      });

      it('metric value', async () => {
        await dashboardExpect.metricValuesExist(['101']);
      });

      it('tag cloud', async () => {
        await dashboardExpect.tagCloudWithValuesFound(['9,972', '4,886', '1,944', '9,025']);
      });

      it('tsvb metric', async () => {
        await dashboardExpect.tsvbMetricValuesExist(['50,465 custom template']);
      });

      it('tsvb top n', async () => {
        await dashboardExpect.tsvbTopNValuesExist(['6,308.125', '6,308.125']);
      });

      it('tsvb markdown', async () => {
        await dashboardExpect.tsvbMarkdownWithValuesExists(['7,209.286']);
      });

      it('saved searches', async () => {
        await dashboardExpect.savedSearchRowsExist();
      });

      it('vega', async () => {
        await dashboardExpect.vegaTextsExist(['5,000']);
      });
    });

    describe('nested filtering', () => {
      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('visualization saved with a query filters data', async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultDataRange();

        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await queryBar.setQuery('weightLbs:>50');
        await queryBar.submitQuery();

        await PageObjects.header.waitUntilLoadingHasFinished();

        // We are on the visualize page, not dashboard, so can't use "PageObjects.dashboard.waitForRenderComplete();"
        // as that expects an item with the `data-shared-items-count` tag.
        await renderable.waitForRender();
        await pieChart.expectPieSliceCount(3);

        await PageObjects.visualize.saveVisualizationExpectSuccess(
          'Rendering Test: animal sounds pie'
        );
        await PageObjects.header.clickDashboard();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(3);
      });

      it('Nested visualization filter pills filters data as expected', async () => {
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        await pieChart.filterOnPieSlice('grr');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await pieChart.expectPieSliceCount(1);

        await PageObjects.visualize.saveVisualizationExpectSuccess('animal sounds pie');
        await PageObjects.header.clickDashboard();

        await pieChart.expectPieSliceCount(1);
      });

      it('Removing filter pills and query unfiters data as expected', async () => {
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        await queryBar.setQuery('');
        await queryBar.submitQuery();
        await filterBar.removeFilter('sound.keyword');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await pieChart.expectPieSliceCount(5);

        await PageObjects.visualize.saveVisualizationExpectSuccess(
          'Rendering Test: animal sounds pie'
        );
        await PageObjects.header.clickDashboard();

        await pieChart.expectPieSliceCount(5);
      });

      it('Pie chart linked to saved search filters data', async () => {
        await dashboardAddPanel.addVisualization(
          'Filter Test: animals: linked to search with filter'
        );
        await pieChart.expectPieSliceCount(7);
      });

      it('Pie chart linked to saved search filters shows no data with conflicting dashboard query', async () => {
        await queryBar.setQuery('weightLbs<40');
        await queryBar.submitQuery();
        await PageObjects.dashboard.waitForRenderComplete();

        await pieChart.expectPieSliceCount(5);
      });
    });
  });
}
