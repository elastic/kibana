/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

const dashboardName = 'Dashboard Test Time';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker']);
  const browser = getService('browser');

  describe('dashboard time', () => {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.common.navigateToApp('dashboard');
    });

    describe('dashboard without stored timed', () => {
      it('is saved', async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.addVisualizations([
          PageObjects.dashboard.getTestVisualizationNames()[0],
        ]);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: false });
      });

      it('Does not set the time picker on open', async () => {
        await PageObjects.timePicker.setDefaultAbsoluteRange();

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal(PageObjects.timePicker.defaultStartTime);
        expect(time.end).to.equal(PageObjects.timePicker.defaultEndTime);
      });
    });

    describe('dashboard with stored timed', function () {
      it('is saved with time', async function () {
        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });
      });

      it('sets time on open', async function () {
        await PageObjects.timePicker.setAbsoluteRange(
          'Jan 1, 2019 @ 00:00:00.000',
          'Jan 2, 2019 @ 00:00:00.000'
        );

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal(PageObjects.timePicker.defaultStartTime);
        expect(time.end).to.equal(PageObjects.timePicker.defaultEndTime);
      });

      // If time is stored with a dashboard, it's supposed to override the current time settings when opened.
      // However, if the URL also contains time in the global state, then the global state
      // time should take precedence.
      it('should be overwritten by global state', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();

        await PageObjects.dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/view/${id}?_g=(time:(from:now-1h,to:now))`;
        await browser.get(urlWithGlobalTime, false);
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('~ an hour ago');
        expect(time.end).to.equal('now');
      });

      it('should use saved time, if time is missing in global state, but _g is present in the url', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();

        await PageObjects.dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/view/${id}?_g=(filters:!())`;
        await browser.get(urlWithGlobalTime, false);
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal(PageObjects.timePicker.defaultStartTime);
        expect(time.end).to.equal(PageObjects.timePicker.defaultEndTime);
      });
    });

    // If the user has time stored with a dashboard, it's supposed to override the current time settings
    // when it's opened. However, if the user then changes the time, navigates to visualize, then navigates
    // back to dashboard, the overridden time should be preserved. The time is *only* reset on open, not
    // during navigation or page refreshes.
    describe('time changes', function () {
      it('preserved during navigation', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        await PageObjects.timePicker.setAbsoluteRange(
          'Jan 1, 2019 @ 00:00:00.000',
          'Jan 2, 2019 @ 00:00:00.000'
        );
        await PageObjects.header.clickVisualize();
        await PageObjects.header.clickDashboard();

        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('Jan 1, 2019 @ 00:00:00.000');
        expect(time.end).to.equal('Jan 2, 2019 @ 00:00:00.000');
      });
    });
  });
}
