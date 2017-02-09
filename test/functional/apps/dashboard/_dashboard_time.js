import expect from 'expect.js';

import { bdd } from '../../../support';
import PageObjects from '../../../support/page_objects';

const dashboardName = 'Dashboard Test Time';

bdd.describe('dashboard time', function dashboardSaveWithTime() {
  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.describe('dashboard without stored timed', async function () {
    bdd.it('is saved', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PageObjects.dashboard.getTestVisualizationNames()[0]]);
      await PageObjects.dashboard.saveDashboard(dashboardName, false);
    });

    bdd.it('Does not set the time picker on open', async function () {
      await PageObjects.dashboard.clickDoneEditing();
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      await PageObjects.dashboard.loadSavedDashboard(dashboardName);

      const fromTimeNext = await PageObjects.header.getFromTime();
      const toTimeNext = await PageObjects.header.getToTime();
      expect(fromTimeNext).to.equal(fromTime);
      expect(toTimeNext).to.equal(toTime);
    });
  });

  bdd.describe('dashboard with stored timed', async function () {
    bdd.it('is saved with quick time', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.header.setQuickTime('Today');
      await PageObjects.dashboard.saveDashboard(dashboardName, true);
    });

    bdd.it('sets quick time on open', async function () {
      await PageObjects.dashboard.clickDoneEditing();
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      await PageObjects.dashboard.loadSavedDashboard(dashboardName);

      const prettyPrint = await PageObjects.header.getPrettyDuration();
      expect(prettyPrint).to.equal('Today');
    });

    bdd.it('is saved with absolute time', async function () {
      await PageObjects.dashboard.clickEdit();
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.saveDashboard(dashboardName, true);
    });

    bdd.it('sets absolute time on open', async function () {
      await PageObjects.dashboard.clickDoneEditing();
      await PageObjects.header.setQuickTime('Today');

      await PageObjects.dashboard.loadSavedDashboard(dashboardName);

      const fromTimeNext = await PageObjects.header.getFromTime();
      const toTimeNext = await PageObjects.header.getToTime();
      expect(fromTimeNext).to.equal('2015-09-19 06:31:44.000');
      expect(toTimeNext).to.equal('2015-09-23 18:31:44.000');
    });
  });

});
