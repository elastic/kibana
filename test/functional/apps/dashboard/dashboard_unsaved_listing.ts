/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  let existingDashboardPanelCount = 0;
  const dashboardTitle = 'few panels';
  const unsavedDashboardTitle = 'New Dashboard';
  const newDashboartTitle = 'A Wild Dashboard';

  describe('dashboard unsaved listing', () => {
    const addSomePanels = async () => {
      // add an area chart by value
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAggBasedVisualizations();
      await PageObjects.visualize.clickAreaChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.visualize.saveVisualizationAndReturn();

      // add a metric by reference
      await dashboardAddPanel.addVisualization('Rendering-Test: metric');
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('lists unsaved changes to existing dashboards', async () => {
      await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
      await PageObjects.dashboard.switchToEditMode();
      await addSomePanels();
      existingDashboardPanelCount = await PageObjects.dashboard.getPanelCount();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.expectUnsavedChangesListingExists(dashboardTitle);
    });

    it('restores unsaved changes to existing dashboards', async () => {
      await PageObjects.dashboard.clickUnsavedChangesContinueEditing(dashboardTitle);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const currentPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(existingDashboardPanelCount);
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('lists unsaved changes to new dashboards', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await addSomePanels();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.expectUnsavedChangesListingExists(unsavedDashboardTitle);
    });

    it('restores unsaved changes to new dashboards', async () => {
      await PageObjects.dashboard.clickUnsavedChangesContinueEditing(unsavedDashboardTitle);
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.dashboard.getPanelCount()).to.eql(2);
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('shows a warning on create new, and restores panels if continue is selected', async () => {
      await PageObjects.dashboard.clickNewDashboardExpectWarning(true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.dashboard.getPanelCount()).to.eql(2);
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('shows a warning on create new, and clears unsaved panels if discard is selected', async () => {
      await PageObjects.dashboard.clickNewDashboardExpectWarning();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.dashboard.getPanelCount()).to.eql(0);
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('does not show unsaved changes on new dashboard when no panels have been added', async () => {
      await PageObjects.dashboard.expectUnsavedChangesDoesNotExist(unsavedDashboardTitle);
    });

    it('can discard unsaved changes using the discard link', async () => {
      await PageObjects.dashboard.clickUnsavedChangesDiscard(dashboardTitle);
      await PageObjects.dashboard.expectUnsavedChangesDoesNotExist(dashboardTitle);
      await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
      await PageObjects.dashboard.switchToEditMode();
      const currentPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(existingDashboardPanelCount - 2);
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('loses unsaved changes to new dashboard upon saving', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await addSomePanels();

      // ensure that the unsaved listing exists first
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.clickUnsavedChangesContinueEditing(unsavedDashboardTitle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Save the dashboard, and check that it now does not exist
      await PageObjects.dashboard.saveDashboard(newDashboartTitle);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.expectUnsavedChangesDoesNotExist(unsavedDashboardTitle);
    });

    it('does not list unsaved changes when unsaved version of the dashboard is the same', async () => {
      await PageObjects.dashboard.loadSavedDashboard(newDashboartTitle);
      await PageObjects.dashboard.switchToEditMode();

      // add another panel so we can delete it later
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAggBasedVisualizations();
      await PageObjects.visualize.clickAreaChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.visualize.saveVisualizationExpectSuccess('Wildvis', {
        redirectToOrigin: true,
      });

      // ensure that the unsaved listing exists
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.expectUnsavedChangesListingExists(newDashboartTitle);
      await PageObjects.dashboard.clickUnsavedChangesContinueEditing(newDashboartTitle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Remove the panel that was just added
      await dashboardPanelActions.removePanelByTitle('Wildvis');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Check that it now does not exist
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.expectUnsavedChangesDoesNotExist(newDashboartTitle);
    });
  });
}
