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

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'settings']);
  const a11y = getService('a11y');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');

  describe('Dashboard', () => {
    const dashboardName = 'Dashboard Listing A11y';
    const clonedDashboardName = 'Dashboard Listing A11y Copy';

    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
    });

    after(async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await listingTable.searchForItemWithName(dashboardName);
      await listingTable.checkListingSelectAllCheckbox();
      await listingTable.clickDeleteSelected();
      await PageObjects.common.clickConfirmOnModal();
    });

    it('dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await a11y.testAppSnapshot();
    });

    it('create dashboard button', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await a11y.testAppSnapshot();
    });

    it('save empty dashboard', async () => {
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await a11y.testAppSnapshot();
    });

    it('Open Edit mode', async () => {
      await PageObjects.dashboard.switchToEditMode();
      await a11y.testAppSnapshot();
    });

    it('Open add panel', async () => {
      await dashboardAddPanel.clickOpenAddPanel();
      await a11y.testAppSnapshot();
    });

    it('add a visualization', async () => {
      await testSubjects.click('savedObjectTitle[Flights]-Delay-Buckets');
      await a11y.testAppSnapshot();
    });

    it('add a saved search', async () => {
      await dashboardAddPanel.addSavedSearch('[Flights] Flight Log');
      await a11y.testAppSnapshot();
    });

    it('save the dashboard', async () => {
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await a11y.testAppSnapshot();
    });

    it('Open Edit mode', async () => {
      await PageObjects.dashboard.switchToEditMode();
      await a11y.testAppSnapshot();
    });

    it('open options menu', async () => {
      await PageObjects.dashboard.openOptions();
      await a11y.testAppSnapshot();
    });

    it('Should be able to hide panel titles', async () => {
      await testSubjects.click('dashboardPanelTitlesCheckbox');
      await a11y.testAppSnapshot();
    });

    it('Should be able display panels without margins', async () => {
      await testSubjects.click('dashboardMarginsCheckbox');
      await a11y.testAppSnapshot();
    });

    it('Open add panel', async () => {
      await dashboardAddPanel.clickOpenAddPanel();
      await a11y.testAppSnapshot();
    });

    it('Add one more saved object to cancel it', async () => {
      await testSubjects.click('savedObjectTitle[Flights]-Average-Ticket-Price');
      await a11y.testAppSnapshot();
    });

    it('Close add panel', async () => {
      await dashboardAddPanel.closeAddPanel();
      await a11y.testAppSnapshot();
    });

    it('Exit out of edit mode', async () => {
      await PageObjects.dashboard.clickCancelOutOfEditMode();
      await a11y.testAppSnapshot();
    });

    it('Discard changes', async () => {
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.dashboard.getIsInViewMode();
      await a11y.testAppSnapshot();
    });

    it('Test full screen', async () => {
      await PageObjects.dashboard.clickFullScreenMode();
      await a11y.testAppSnapshot();
    });

    it('Exit out of full screen mode', async () => {
      await PageObjects.dashboard.exitFullScreenMode();
      await a11y.testAppSnapshot();
    });

    it('Make a clone of the dashboard', async () => {
      await PageObjects.dashboard.clickClone();
      await a11y.testAppSnapshot();
    });

    it('Confirm clone with *copy* appended', async () => {
      await PageObjects.dashboard.confirmClone();
      await a11y.testAppSnapshot();
    });

    it('Dashboard listing table', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await a11y.testAppSnapshot();
    });

    it('Delete a11y clone dashboard', async () => {
      await listingTable.searchForItemWithName(clonedDashboardName);
      await listingTable.checkListingSelectAllCheckbox();
      await listingTable.clickDeleteSelected();
      await a11y.testAppSnapshot();
      await PageObjects.common.clickConfirmOnModal();
      await listingTable.searchForItemWithName('');
    });
  });
}
