import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const remote = getService('remote');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard']);

  describe('dashboard grid', () => {
    before(async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.clickEdit();
    });

    describe('move panel', () => {
      // Specific test after https://github.com/elastic/kibana/issues/14764 fix
      it('Can move panel from bottom to top row', async () => {
        const lastVisTitle = 'Rendering Test: datatable';
        const panelTitleBeforeMove = await dashboardPanelActions.getPanelHeading(lastVisTitle);
        const position1 = await panelTitleBeforeMove.getPosition();

        remote
          .moveMouseTo(panelTitleBeforeMove)
          .pressMouseButton()
          .moveMouseTo(null, -20, -450)
          .releaseMouseButton();

        const panelTitleAfterMove = await dashboardPanelActions.getPanelHeading(lastVisTitle);
        const position2 = await panelTitleAfterMove.getPosition();

        expect(position1.y).to.be.greaterThan(position2.y);
      });
    });
  });
}
