/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'settings']);
  const a11y = getService('a11y');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardSettings = getService('dashboardSettings');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');

  describe('Dashboard', () => {
    const dashboardName = 'Dashboard Listing A11y';
    const clonedDashboardName = 'Dashboard Listing A11y (1)';

    it('navitate to dashboard app', async () => {
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
      await testSubjects.setValue('savedObjectFinderSearchInput', '[Flights]');
      await testSubjects.click('savedObjectTitle[Flights]-Departures-Count-Map');
      await a11y.testAppSnapshot();
    });

    it('add a saved search', async () => {
      await dashboardAddPanel.addSavedSearch('[Flights] Flight Log');
      await a11y.testAppSnapshot();
    });

    it('save the dashboard', async () => {
      await PageObjects.dashboard.saveDashboard(dashboardName, { saveAsNew: false });
      await a11y.testAppSnapshot();
    });

    it('Open Edit mode again', async () => {
      await PageObjects.dashboard.switchToEditMode();
      await a11y.testAppSnapshot();
    });

    it('open settings flyout', async () => {
      await PageObjects.dashboard.openSettingsFlyout();
      await a11y.testAppSnapshot();
    });

    it('Should be able to hide panel titles', async () => {
      await dashboardSettings.toggleShowPanelTitles(false);
      await a11y.testAppSnapshot();
    });

    it('Should be able display panels without margins', async () => {
      await dashboardSettings.toggleUseMarginsBetweenPanels(true);
      await a11y.testAppSnapshot();
    });

    it('close settings flyout', async () => {
      await dashboardSettings.clickCancelButton();
      await a11y.testAppSnapshot();
    });

    it('Open add panel again', async () => {
      await dashboardAddPanel.clickOpenAddPanel();
      await a11y.testAppSnapshot();
    });

    it('Add one more saved object to cancel it', async () => {
      await testSubjects.setValue('savedObjectFinderSearchInput', '[Flights]');
      await testSubjects.click(
        'savedObjectTitle[Flights]-Airport-Connections-(Hover-Over-Airport)'
      );
      await a11y.testAppSnapshot();
    });

    it('Close add panel', async () => {
      await dashboardAddPanel.closeAddPanel();
      await a11y.testAppSnapshot();
    });

    it('Exit out of edit mode', async () => {
      await PageObjects.dashboard.clickCancelOutOfEditMode(false);
      await a11y.testAppSnapshot();
    });

    it('Discard changes', async () => {
      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.dashboard.getIsInViewMode();
      await a11y.testAppSnapshot();
    });

    // https://github.com/elastic/kibana/issues/153597
    it.skip('Test full screen', async () => {
      await PageObjects.dashboard.clickFullScreenMode();
      await a11y.testAppSnapshot();
    });

    // https://github.com/elastic/kibana/issues/153597
    it.skip('Exit out of full screen mode', async () => {
      await PageObjects.dashboard.exitFullScreenMode();
      await a11y.testAppSnapshot();
    });

    it('Make a clone of the dashboard', async () => {
      await PageObjects.dashboard.duplicateDashboard();
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
      await listingTable.isShowingEmptyPromptCreateNewButton();
    });
  });
}
