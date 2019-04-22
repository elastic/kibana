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

import expect from '@kbn/expect';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header']);

  describe('dashboard save', function describeIndexTests() {
    const dashboardName = 'Dashboard Save Test';
    const dashboardNameEnterKey = 'Dashboard Save Test with Enter Key';

    before(async function () {
      await PageObjects.dashboard.initTests();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('warns on duplicate name for new dashboard', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: false });

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, { waitDialogIsClosed: false });
      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });
    });

    it('does not save on reject confirmation', async function () {
      await PageObjects.dashboard.cancelSave();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
      expect(countOfDashboards).to.equal(1);
    });

    it('Saves on confirm duplicate title warning', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, { waitDialogIsClosed: false });

      await PageObjects.dashboard.clickSave();

      // This is important since saving a new dashboard will cause a refresh of the page. We have to
      // wait till it finishes reloading or it might reload the url after simulating the
      // dashboard landing page click.
      await PageObjects.header.waitUntilLoadingHasFinished();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
      expect(countOfDashboards).to.equal(2);
    });

    it('Does not warn when you save an existing dashboard with the title it already has, and that title is a duplicate',
      async function () {
        await PageObjects.dashboard.selectDashboard(dashboardName);
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.dashboard.saveDashboard(dashboardName);

        await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: false });
      }
    );

    it('Warns you when you Save as New Dashboard, and the title is a duplicate', async function () {
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, { saveAsNew: true });

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });

      await PageObjects.dashboard.cancelSave();
    });

    it('Does not warn when only the prefix matches', async function () {
      await PageObjects.dashboard.saveDashboard(dashboardName.split(' ')[0]);

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: false });
    });

    it('Warns when case is different', async function () {
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName.toUpperCase(), { waitDialogIsClosed: false });

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });

      await PageObjects.dashboard.cancelSave();
    });

    it('Saves new Dashboard using the Enter key', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndPressEnter(dashboardNameEnterKey);

      // This is important since saving a new dashboard will cause a refresh of the page. We have to
      // wait till it finishes reloading or it might reload the url after simulating the
      // dashboard landing page click.
      await PageObjects.header.waitUntilLoadingHasFinished();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardNameEnterKey);
      expect(countOfDashboards).to.equal(1);
    });

  });
}
