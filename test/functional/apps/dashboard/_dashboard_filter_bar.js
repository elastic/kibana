import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';

export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize']);

  describe('dashboard filter bar', function describeIndexTests() {
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

    it('Filter bar field list uses default index pattern on an empty dashboard', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await testSubjects.click('addFilter');
      await dashboardExpect.fieldSuggestionIndexPatterns(['logstash-*']);
    });

    // TODO: Use a data set that has more than one index pattern to better test this.
    it('Filter bar field list shows index pattern of vis when one is added', async () => {
      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      await testSubjects.click('filterfieldSuggestionList');
      await dashboardExpect.fieldSuggestionIndexPatterns(['logstash-*']);
    });

    it('Filter bar field list works when a vis with no index pattern is added', async () => {
      await dashboardVisualizations.createAndAddMarkdown({ name: 'markdown', markdown: 'hi ima markdown' });
      await testSubjects.click('addFilter');
      await dashboardExpect.fieldSuggestionIndexPatterns(['logstash-*']);
    });
  });
}
