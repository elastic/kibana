import expect from 'expect.js';

import { bdd } from '../../../support';
import PageObjects from '../../../support/page_objects';

const dashboardName = 'Dashboard Test 2';

bdd.describe('dashboard view edit mode', function viewEditModeTests() {
  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.it('create new dashboard opens in edit mode', async function () {
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.clickDoneEditing();
  });

  bdd.it('create test dashboard', async function () {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
    await PageObjects.dashboard.saveDashboard(dashboardName);
  });

  bdd.it('open dashboard in view mode and click edit', async function () {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);
    await PageObjects.dashboard.clickEdit();
  });

  bdd.describe('change filters in view mode', async function () {
    bdd.describe('shows filter conflict', async function () {
      bdd.describe('and reloads dashboard defaults', async function () {
        bdd.it('for different filter', async function () {
          await PageObjects.dashboard.clickDoneEditing();
          await PageObjects.dashboard.setTimepickerInDataRange();

          await PageObjects.common.sleep(1000);
          await PageObjects.dashboard.filterOnPieSlice();
          await PageObjects.common.sleep(1000);

          let descriptions = await PageObjects.dashboard.getFilterDescriptions();

          expect(descriptions.length).to.equal(1);

          await PageObjects.dashboard.clickEdit();
          await PageObjects.common.sleep(1000);

          // Confirm will load the dashboard defaults
          await PageObjects.common.clickConfirmOnModal();

          descriptions = await PageObjects.dashboard.getFilterDescriptions();

          expect(descriptions.length).to.equal(0);
        });

        bdd.it('for different query', async function () {
          await PageObjects.dashboard.clickDoneEditing();
          await PageObjects.dashboard.appendQuery('my search query');
          await PageObjects.dashboard.clickFilterButton();
          await PageObjects.dashboard.clickEdit();

          // Confirm will load the dashboard defaults
          await PageObjects.common.clickConfirmOnModal();

          const query = await PageObjects.dashboard.getQuery();
          expect(query).to.equal('*');
        });

        bdd.it('for different time when time stored in dash', async function () {
          const fromTime = '2015-09-19 06:31:44.000';
          const toTime = '2015-09-23 18:31:44.000';
          await PageObjects.header.setAbsoluteRange(fromTime, toTime);

          let newFromTime = await PageObjects.header.getFromTime();
          let newToTime = await PageObjects.header.getToTime();
          expect(newFromTime).to.equal(fromTime);
          expect(newToTime).to.equal(toTime);

          PageObjects.common.debug('Saving dashboard with time');
          await PageObjects.dashboard.saveDashboard(dashboardName, true);

          PageObjects.common.debug('Click done editing after save');
          await PageObjects.dashboard.clickDoneEditing();

          PageObjects.common.debug('Changing time in view mode');
          await PageObjects.header.setAbsoluteRange('2011-09-19 06:31:44.000', '2011-09-19 06:31:44.000');

          newFromTime = await PageObjects.header.getFromTime();
          newToTime = await PageObjects.header.getToTime();

          expect(newFromTime).to.equal('2011-09-19 06:31:44.000');
          expect(newToTime).to.equal('2011-09-19 06:31:44.000');

          PageObjects.common.debug('Entering edit mode');
          await PageObjects.dashboard.clickEdit();

          PageObjects.common.debug('Load dashboard filters');
          // Confirm should load filters saved with the dashboard.
          await PageObjects.common.clickConfirmOnModal();

          await PageObjects.header.clickTimepicker();

          newFromTime = await PageObjects.header.getFromTime();
          newToTime = await PageObjects.header.getToTime();

          expect(newFromTime).to.equal(fromTime);
          expect(newToTime).to.equal(toTime);
        });
      });

      bdd.describe('and preserves current values', async function () {
        bdd.it('for different filter', async function () {
          await PageObjects.dashboard.clickDoneEditing();
          await PageObjects.dashboard.setTimepickerInDataRange();

          await PageObjects.common.sleep(1000);
          await PageObjects.dashboard.filterOnPieSlice();
          await PageObjects.common.sleep(1000);

          let descriptions = await PageObjects.dashboard.getFilterDescriptions();

          expect(descriptions.length).to.equal(1);

          await PageObjects.dashboard.clickEdit();
          await PageObjects.common.sleep(1000);

          await PageObjects.common.clickCancelOnModal();

          descriptions = await PageObjects.dashboard.getFilterDescriptions();

          expect(descriptions.length).to.equal(1);

          // Click done Editing and confirm lose changes
          await PageObjects.dashboard.clickDoneEditing();
          await PageObjects.common.clickCancelOnModal();
          await PageObjects.common.sleep(1000);
        });

        bdd.it('for different query', async function () {
          await PageObjects.dashboard.appendQuery('my search query');
          await PageObjects.dashboard.clickFilterButton();
          await PageObjects.dashboard.clickEdit();

          // Confirm will load the dashboard defaults
          await PageObjects.common.clickCancelOnModal();

          const query = await PageObjects.dashboard.getQuery();
          expect(query).to.equal('*my search query');

          // Click done Editing and confirm lose changes
          await PageObjects.dashboard.clickDoneEditing();
          await PageObjects.common.clickCancelOnModal();
        });

        bdd.it('for different time when time stored in dash', async function () {
          await PageObjects.dashboard.clickEdit();
          await PageObjects.header.setAbsoluteRange('2015-09-19 06:31:44.000', '2015-09-23 18:31:44.000');
          await PageObjects.dashboard.saveDashboard(dashboardName, true);
          await PageObjects.dashboard.clickDoneEditing();

          const fromTime = '2011-09-19 06:31:44.000';
          const toTime = '2011-09-23 18:31:44.000';
          await PageObjects.header.setAbsoluteRange(fromTime, toTime);
          await PageObjects.dashboard.clickEdit();

          await PageObjects.common.clickCancelOnModal();

          await PageObjects.header.clickTimepicker();
          const newFromTime = await PageObjects.header.getFromTime();
          const newToTime = await PageObjects.header.getToTime();

          expect(newFromTime).to.equal(fromTime);
          expect(newToTime).to.equal(toTime);
        });
      });
    });

    bdd.describe('does not show filter conflict', async function () {
      bdd.it('for different time when time is not stored in dash', async function () {
        await PageObjects.dashboard.saveDashboard(dashboardName, false);
        await PageObjects.dashboard.clickDoneEditing();

        await PageObjects.header.setAbsoluteRange('2013-09-19 06:31:44.000', '2013-09-19 06:31:44.000');

        await PageObjects.dashboard.clickEdit();

        const isOpen = await PageObjects.common.isConfirmModalOpen();
        expect(isOpen).to.be(false);
      });
    });
  });

  bdd.describe('shows lose changes warning', async function () {
    bdd.describe('and loses changes', function () {
      bdd.it('when time changed is stored with dashboard', async function () {
        const originalFromTime = '2015-09-19 06:31:44.000';
        const originalToTime = '2015-09-19 06:31:44.000';
        await PageObjects.header.setAbsoluteRange(originalFromTime, originalToTime);
        await PageObjects.dashboard.saveDashboard(dashboardName, true);
        await PageObjects.header.setAbsoluteRange('2013-09-19 06:31:44.000', '2013-09-19 06:31:44.000');
        await PageObjects.dashboard.clickDoneEditing();

        // confirm lose changes
        await PageObjects.common.clickCancelOnModal();

        const newFromTime = await PageObjects.header.getFromTime();
        const newToTime = await PageObjects.header.getToTime();

        expect(newFromTime).to.equal(originalFromTime);
        expect(newToTime).to.equal(originalToTime);
      });
    });

    bdd.describe('and saves dashboard', function () {
      bdd.it('when time changed is stored with dashboard', async function () {
        await PageObjects.dashboard.clickEdit();
        const newFromTime = '2015-09-19 06:31:44.000';
        const newToTime = '2015-09-19 06:31:44.000';
        await PageObjects.header.setAbsoluteRange('2013-09-19 06:31:44.000', '2013-09-19 06:31:44.000');
        await PageObjects.dashboard.saveDashboard(dashboardName, true);
        await PageObjects.header.setAbsoluteRange(newToTime, newToTime);
        await PageObjects.dashboard.clickDoneEditing();

        // Save dashboard
        await PageObjects.common.clickConfirmOnModal();

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const fromTime = await PageObjects.header.getFromTime();
        const toTime = await PageObjects.header.getToTime();

        expect(fromTime).to.equal(newFromTime);
        expect(toTime).to.equal(newToTime);
      });
    });
  });

  bdd.describe('Does not show lose changes warning', async function () {
    bdd.it('when time changed is not stored with dashboard', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.saveDashboard(dashboardName, false);
      await PageObjects.header.setAbsoluteRange('2013-10-19 06:31:44.000', '2013-12-19 06:31:44.000');
      await PageObjects.dashboard.clickDoneEditing();

      const isOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isOpen).to.be(false);
    });
  });
});
