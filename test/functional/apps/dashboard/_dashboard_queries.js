import expect from 'expect.js';

import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';

/**
 * Test the querying capabilities of dashboard, and make sure visualizations show the expected results, especially
 * with nested queries and filters on the visualizations themselves.
 */
export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize']);

  describe('dashboard queries', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('Nested visualization query filters data as expected', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();

      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      await PageObjects.dashboard.clickEditVisualization();
      await PageObjects.dashboard.setQuery('memory:<80000');
      await PageObjects.dashboard.clickFilterButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardExpect.pieSliceCount(2);

      await PageObjects.visualize.saveVisualization(PIE_CHART_VIS_NAME);
      await PageObjects.header.clickDashboard();

      await dashboardExpect.pieSliceCount(2);
    });

    it('Nested visualization filter pills filters data as expected', async () => {
      await PageObjects.dashboard.clickEditVisualization();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.filterOnPieSlice();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardExpect.pieSliceCount(1);

      await PageObjects.visualize.saveVisualization(PIE_CHART_VIS_NAME);
      await PageObjects.header.clickDashboard();

      await dashboardExpect.pieSliceCount(1);
    });

    it('Pie chart attached to saved search filters data as expected', async () => {
      await dashboardVisualizations.createAndAddSavedSearch({
        name: 'bytes < 90',
        query: 'bytes:<90',
        fields: ['bytes']
      });

      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      await PageObjects.dashboard.clickAddVisualization();
      await PageObjects.dashboard.clickAddNewVisualizationLink();
      await PageObjects.visualize.clickPieChart();
      await PageObjects.visualize.selectSearch('bytes < 90');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.clickBucket('Split Slices');
      await PageObjects.visualize.selectAggregation('Terms');
      await PageObjects.visualize.selectField('memory');
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.saveVisualization('memory with bytes < 90 pie');

      await dashboardExpect.pieSliceCount(3);
    });

    it('Pie chart attached to saved search filters shows no data with conflicting dashboard query', async () => {
      await PageObjects.dashboard.setQuery('bytes:>100');
      await PageObjects.dashboard.clickFilterButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await dashboardExpect.pieSliceCount(0);
    });

    describe('visualizations without SearchSource', async function () {
      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.addVisualizations(['Visualization InputControl']);
      });

      it(`should have filter bar with 'Add a filter'`, async function () {
        const hasAddFilter = await testSubjects.exists('addFilter');
        expect(hasAddFilter).to.be(true);
      });
    });

    describe('filters', async function () {
      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
      });

      it('are not selected by default', async function () {
        const filters = await PageObjects.dashboard.getFilters(1000);
        expect(filters.length).to.equal(0);
      });

      it('are added when a pie chart slice is clicked', async function () {
        await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
        // Click events not added until visualization is finished rendering.
        // See https://github.com/elastic/kibana/issues/15480#issuecomment-350195245 for more info on why
        // this is necessary.
        await PageObjects.dashboard.waitForRenderComplete();
        await PageObjects.dashboard.filterOnPieSlice();
        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(1);

        await dashboardExpect.pieSliceCount(1);
      });

      it('are preserved after saving a dashboard', async () => {
        await PageObjects.dashboard.saveDashboard('with filters');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(1);

        await dashboardExpect.pieSliceCount(1);
      });

      it('are preserved after opening a dashboard saved with filters', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('with filters');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(1);

        await dashboardExpect.pieSliceCount(1);
      });
    });

  });
}
