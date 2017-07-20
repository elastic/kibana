import expect from 'expect.js';

const dashboardName = 'Dashboard Test Time';

const fromTime = '2015-09-19 06:31:44.000';
const toTime = '2015-09-23 18:31:44.000';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header']);

  describe('dashboard time', function dashboardSaveWithTime() {
    before(async function () {
      await PageObjects.dashboard.initTests();

      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    describe('dashboard without stored timed', async function () {
      it('is saved', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.addVisualizations([PageObjects.dashboard.getTestVisualizationNames()[0]]);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: false });
        await PageObjects.header.clickToastOK();
      });

      it.skip('Does not set the time picker on open', async function () {
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const fromTimeNext = await PageObjects.header.getFromTime();
        const toTimeNext = await PageObjects.header.getToTime();
        expect(fromTimeNext).to.equal(fromTime);
        expect(toTimeNext).to.equal(toTime);
      });
    });

    describe('dashboard with stored timed', async function () {
      it('is saved with quick time', async function () {
        await PageObjects.dashboard.clickEdit();
        await PageObjects.header.setQuickTime('Today');
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });
        await PageObjects.header.clickToastOK();
      });

      it('sets quick time on open', async function () {
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const prettyPrint = await PageObjects.header.getPrettyDuration();
        expect(prettyPrint).to.equal('Today');
      });

      it('is saved with absolute time', async function () {
        await PageObjects.dashboard.clickEdit();
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });
        await PageObjects.header.clickToastOK();
      });

      it('sets absolute time on open', async function () {
        await PageObjects.header.setQuickTime('Today');

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const fromTimeNext = await PageObjects.header.getFromTime();
        const toTimeNext = await PageObjects.header.getToTime();
        expect(fromTimeNext).to.equal(fromTime);
        expect(toTimeNext).to.equal(toTime);
      });
    });

    // If the user has time stored with a dashboard, it's supposed to override the current time settings
    // when it's opened. However, if the user then changes the time, navigates to visualize, then navigates
    // back to dashboard, the overridden time should be preserved. The time is *only* reset on open, not
    // during navigation or page refreshes.
    describe.skip('time changes', function () {
      it('preserved during navigation', async function () {
        await PageObjects.header.setQuickTime('Today');
        await PageObjects.header.clickVisualize();
        await PageObjects.header.clickDashboard();

        const prettyPrint = await PageObjects.header.getPrettyDuration();
        expect(prettyPrint).to.equal('Today');
      });
    });
  });
}
