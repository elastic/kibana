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

/**
 * Test the querying capabilities of dashboard, and make sure visualizations show the expected results, especially
 * with nested queries and filters on the visualizations themselves.
 */
export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
  const pieChart = getService('pieChart');
  const queryBar = getService('queryBar');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const renderable = getService('renderable');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize', 'timePicker']);

  describe('dashboard filtering', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('adding a filter that excludes all data', () => {
      before(async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultDataRange();
        await dashboardAddPanel.addEveryVisualization('"Filter Bytes Test"');
        await dashboardAddPanel.addEverySavedSearch('"Filter Bytes Test"');

        await dashboardAddPanel.closeAddPanel();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        await filterBar.addFilter('bytes', 'is', '12345678');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        // first round of requests sometimes times out, refresh all visualizations to fetch again
        await queryBar.clickQuerySubmitButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('filters on pie charts', async () => {
        await pieChart.expectPieSliceCount(0);
      });

      it('area, bar and heatmap charts filtered', async () => {
        await dashboardExpect.seriesElementCount(0);
      });

      it('data tables are filtered', async () => {
        await dashboardExpect.dataTableRowCount(0);
      });

      it('goal and guages are filtered', async () => {
        await dashboardExpect.goalAndGuageLabelsExist(['0', '0%']);
      });

      it('tsvb time series shows no data message', async () => {
        expect(await testSubjects.exists('noTSVBDataMessage')).to.be(true);
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
        await dashboardExpect.tsvbTopNValuesExist(['0', '0']);
      });

      it('saved search is filtered', async () => {
        await dashboardExpect.savedSearchRowCount(0);
      });

      // TODO: Uncomment once https://github.com/elastic/kibana/issues/22561 is fixed
      // it('timelion is filtered', async () => {
      //   await dashboardExpect.timelionLegendCount(0);
      // });

      it('vega is filtered', async () => {
        await dashboardExpect.vegaTextsDoNotExist(['5,000']);
      });
    });

    describe('using a pinned filter that excludes all data', () => {
      before(async () => {
        await filterBar.toggleFilterPinned('bytes');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
      });

      after(async () => {
        await filterBar.toggleFilterPinned('bytes');
      });

      it('filters on pie charts', async () => {
        await pieChart.expectPieSliceCount(0);
      });

      it('area, bar and heatmap charts filtered', async () => {
        await dashboardExpect.seriesElementCount(0);
      });

      it('data tables are filtered', async () => {
        await dashboardExpect.dataTableRowCount(0);
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
        await dashboardExpect.tsvbTopNValuesExist(['0', '0']);
      });

      it('saved search is filtered', async () => {
        await dashboardExpect.savedSearchRowCount(0);
      });

      // TODO: Uncomment once https://github.com/elastic/kibana/issues/22561 is fixed
      // it('timelion is filtered', async () => {
      //   await dashboardExpect.timelionLegendCount(0);
      // });

      it('vega is filtered', async () => {
        await dashboardExpect.vegaTextsDoNotExist(['5,000']);
      });
    });

    describe('disabling a filter unfilters the data on', function () {
      // Flaky test
      // https://github.com/elastic/kibana/issues/41087
      this.tags('skipFirefox');
      before(async () => {
        await filterBar.toggleFilterEnabled('bytes');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('pie charts', async () => {
        await pieChart.expectPieSliceCount(5);
      });

      it('area, bar and heatmap charts', async () => {
        await dashboardExpect.seriesElementCount(3);
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
        await dashboardExpect.savedSearchRowCount(1);
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
