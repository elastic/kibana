/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';

const dashboardName = 'Dashboard Test Time';

const fromTime = '2015-09-19 06:31:44.000';
const toTime = '2015-09-23 18:31:44.000';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'timePicker']);
  const browser = getService('browser');

  describe('dashboard time', () => {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    describe('dashboard without stored timed', () => {
      it('is saved', async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.addVisualizations([PageObjects.dashboard.getTestVisualizationNames()[0]]);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: false });
      });

      it('Does not set the time picker on open', async () => {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('Sep 19, 2015 @ 06:31:44.000');
        expect(time.end).to.equal('Sep 23, 2015 @ 18:31:44.000');
      });
    });

    describe('dashboard with stored timed', async function () {
      it('is saved with time', async function () {
        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });
      });

      it('sets time on open', async function () {
        await PageObjects.timePicker.setAbsoluteRange('2019-01-01 00:00:00.000', '2019-01-02 00:00:00.000');

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('Sep 19, 2015 @ 06:31:44.000');
        expect(time.end).to.equal('Sep 23, 2015 @ 18:31:44.000');
      });

      // If time is stored with a dashboard, it's supposed to override the current time settings when opened.
      // However, if the URL also contains time in the global state, then the global state
      // time should take precedence.
      it('should be overwritten by global state', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();

        await PageObjects.dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/dashboard/${id}?_g=(time:(from:now-1h,to:now))`;
        await browser.get(urlWithGlobalTime, false);
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('~ an hour ago');
        expect(time.end).to.equal('now');
      });
    });

    // If the user has time stored with a dashboard, it's supposed to override the current time settings
    // when it's opened. However, if the user then changes the time, navigates to visualize, then navigates
    // back to dashboard, the overridden time should be preserved. The time is *only* reset on open, not
    // during navigation or page refreshes.
    describe('time changes', function () {
      it('preserved during navigation', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        await PageObjects.timePicker.setAbsoluteRange('2019-01-01 00:00:00.000', '2019-01-02 00:00:00.000');
        await PageObjects.header.clickVisualize();
        await PageObjects.header.clickDashboard();

        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.equal('Jan 1, 2019 @ 00:00:00.000');
        expect(time.end).to.equal('Jan 2, 2019 @ 00:00:00.000');
      });
    });
  });
}
