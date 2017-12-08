import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize']);
  const screenshot = getService('screenshots');
  const remote = getService('remote');

  describe('dashboard snapshots', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await remote.setWindowSize(1200, 900);
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('compare TSVB snapshot', async () => {
      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      // Without this flip the url in test mode looks something like
      // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
      // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await dashboardVisualizations.createAndAddTSVBVisualization('TSVB');
      await PageObjects.dashboard.saveDashboard('tsvb');
      await PageObjects.header.clickToastOK();

      await PageObjects.dashboard.clickFullScreenMode();
      await PageObjects.dashboard.toggleExpandPanel();

      await PageObjects.dashboard.waitForRenderCounter(2);
      const percentSimilar = await screenshot.compareAgainstBaseline('tsvb_dashboard');

      await PageObjects.dashboard.clickExitFullScreenLogoButton();

      expect(percentSimilar).to.be(0);
    });
  });
}
