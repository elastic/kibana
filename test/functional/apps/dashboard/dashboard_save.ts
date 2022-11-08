/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize']);
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard save', function describeIndexTests() {
    this.tags('includeFirefox');
    const dashboardName = 'Dashboard Save Test';
    const dashboardNameEnterKey = 'Dashboard Save Test with Enter Key';

    before(async function () {
      await PageObjects.dashboard.initTests();
    });

    it('warns on duplicate name for new dashboard', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: false });

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, {
        waitDialogIsClosed: false,
      });
      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });
    });

    it('does not save on reject confirmation', async function () {
      await PageObjects.dashboard.cancelSave();
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 1);
    });

    it('Saves on confirm duplicate title warning', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, {
        waitDialogIsClosed: false,
      });

      await PageObjects.dashboard.ensureDuplicateTitleCallout();
      await PageObjects.dashboard.clickSave();

      // This is important since saving a new dashboard will cause a refresh of the page. We have to
      // wait till it finishes reloading or it might reload the url after simulating the
      // dashboard landing page click.
      await PageObjects.header.waitUntilLoadingHasFinished();

      // after saving a new dashboard, the app state must be removed
      await await PageObjects.dashboard.expectAppStateRemovedFromURL();

      await PageObjects.dashboard.gotoDashboardLandingPage();

      await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 2);
    });

    it('Does not warn when you save an existing dashboard with the title it already has, and that title is a duplicate', async function () {
      await listingTable.clickItemLink('dashboard', dashboardName);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: false });
    });

    it('Warns you when you Save as New Dashboard, and the title is a duplicate', async function () {
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, {
        saveAsNew: true,
      });

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });

      await PageObjects.dashboard.cancelSave();
    });

    it('Does not warn when only the prefix matches', async function () {
      await PageObjects.dashboard.saveDashboard(dashboardName.split(' ')[0]);

      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: false });
    });

    it('Warns when case is different', async function () {
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName.toUpperCase(), {
        waitDialogIsClosed: false,
      });

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
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await listingTable.searchAndExpectItemsCount('dashboard', dashboardNameEnterKey, 1);
    });

    it('Does not show quick save menu item on a new dashboard', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.expectMissingQuickSaveOption();
    });

    it('Does not show dashboard save modal when on quick save', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard('test quick save');

      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.expectExistsQuickSaveOption();
      await dashboardAddPanel.clickMarkdownQuickButton();
      await PageObjects.visualize.saveVisualizationAndReturn();
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.clickQuickSave();

      await testSubjects.existOrFail('saveDashboardSuccess');
    });

    it('Stays in edit mode after performing a quick save', async function () {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('dashboardQuickSaveMenuItem');
    });
  });
}
