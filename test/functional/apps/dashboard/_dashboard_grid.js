import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const find = getService('find');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard grid', () => {

    before(async () => {
      return PageObjects.dashboard.initTests();
    });

    after(async () => {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    describe('move panel', () => {
      // Specific test after https://github.com/elastic/kibana/issues/14764 fix
      it('Can move panel from bottom to top row', async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.addVisualizations([
          PageObjects.dashboard.getTestVisualizationNames()[0],
          PageObjects.dashboard.getTestVisualizationNames()[1],
          PageObjects.dashboard.getTestVisualizationNames()[2],
        ]);

        const panels = await find.allByCssSelector('.panel-title');

        const thirdPanel = panels[2];
        const position1 = await thirdPanel.getPosition();

        remote
          .moveMouseTo(thirdPanel)
          .pressMouseButton()
          .moveMouseTo(null, -20, -400)
          .releaseMouseButton();

        const panelsMoved = await find.allByCssSelector('.panel-title');
        const position2 = await panelsMoved[2].getPosition();

        expect(position1.y).to.be.greaterThan(position2.y);
      });
    });
  });
}
