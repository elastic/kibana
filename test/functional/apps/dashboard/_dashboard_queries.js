import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';

/**
 * Test the querying capabilities of dashboard, and make sure visualizations show the expected results, especially
 * with nested queries and filters on the visualizations themselves.
 */
export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize']);

  describe('dashboard queries', function describeIndexTests() {
    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('Nested visualization query filters data as expected', async () => {
      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      // Without this flip the url in test mode looks something like
      // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
      // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();

      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      await PageObjects.dashboard.clickEditVisualization();
      await PageObjects.dashboard.setQuery('memory:<80000');
      await PageObjects.dashboard.clickFilterButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.visualize.saveVisualization(PIE_CHART_VIS_NAME);

      await PageObjects.header.clickDashboard();

      await dashboardExpect.pieSliceCount(2);
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
      await PageObjects.visualize.clickBucket('Split Slices');
      await PageObjects.visualize.selectAggregation('Terms');
      await PageObjects.visualize.selectField('memory');
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.saveVisualization('memory with bytes < 90 pie');
      await PageObjects.header.clickToastOK();

      await dashboardExpect.pieSliceCount(3);
    });

    it('Pie chart attached to saved search filters shows no data with conflicting dashboard query', async () => {
      await PageObjects.dashboard.setQuery('bytes:>100');
      await PageObjects.dashboard.clickFilterButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await dashboardExpect.pieSliceCount(0);
    });
  });
}
