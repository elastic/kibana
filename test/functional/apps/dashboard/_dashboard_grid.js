import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const find = getService('find');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['dashboard', 'header']);

  describe('dashboard grid', function describeIndexTests() {
    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    // Specific test after https://github.com/elastic/kibana/issues/14764 fix
    it('Can move panel from bottom to top row', async function addVisualizations() {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([
        PageObjects.dashboard.getTestVisualizationNames()[0],
        PageObjects.dashboard.getTestVisualizationNames()[1],
        PageObjects.dashboard.getTestVisualizationNames()[2],
      ]);

      const panels = await find.allByCssSelector('.panel-title');

      const thirdPanel = panels[2];
      const thirdPanelTitle = await thirdPanel.getVisibleText();

      remote
        .moveMouseTo(thirdPanel)
        .pressMouseButton()
        .moveMouseTo(panels[0], 0, -15)
        .releaseMouseButton();

      const panelsMoved = await find.allByCssSelector('.panel-title');
      const firstPanel = panelsMoved[0];
      const firstPanelTitle = await firstPanel.getVisibleText();

      expect(firstPanelTitle).to.equal(thirdPanelTitle);
    });
  });
}
