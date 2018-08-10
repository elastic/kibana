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
  const PageObjects = getPageObjects(['dashboard', 'header']);
  const remote = getService('remote');

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
        const isDashboardSaved = await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: false });
        expect(isDashboardSaved).to.eql(true);
      });

      it('Does not set the time picker on open', async () => {
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
        const isDashboardSaved = await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });
        expect(isDashboardSaved).to.eql(true);
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
        const isDashboardSaved = await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });
        expect(isDashboardSaved).to.eql(true);
      });

      it('sets absolute time on open', async function () {
        await PageObjects.header.setQuickTime('Today');

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const fromTimeNext = await PageObjects.header.getFromTime();
        const toTimeNext = await PageObjects.header.getToTime();
        expect(fromTimeNext).to.equal(fromTime);
        expect(toTimeNext).to.equal(toTime);
      });

      // If time is stored with a dashboard, it's supposed to override the current time settings when opened.
      // However, if the URL also contains time in the global state, then the global state
      // time should take precedence.
      it('should be overwritten by global state', async function () {
        const currentUrl = await remote.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();

        await PageObjects.dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/dashboard/${id}?_g=(time:(from:now-1h,mode:quick,to:now))`;
        await remote.get(urlWithGlobalTime, false);
        const prettyPrint = await PageObjects.header.getPrettyDuration();
        expect(prettyPrint).to.equal('Last 1 hour');
      });
    });

    // If the user has time stored with a dashboard, it's supposed to override the current time settings
    // when it's opened. However, if the user then changes the time, navigates to visualize, then navigates
    // back to dashboard, the overridden time should be preserved. The time is *only* reset on open, not
    // during navigation or page refreshes.
    describe('time changes', function () {
      it('preserved during navigation', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        await PageObjects.header.setQuickTime('Today');
        await PageObjects.header.clickVisualize();
        await PageObjects.header.clickDashboard();

        const prettyPrint = await PageObjects.header.getPrettyDuration();
        expect(prettyPrint).to.equal('Today');
      });
    });
  });
}
