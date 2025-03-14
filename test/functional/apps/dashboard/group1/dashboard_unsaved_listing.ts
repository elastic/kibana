/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header } = getPageObjects(['dashboard', 'header']);
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const dashboardTitle = 'few panels';
  const originalPanelCount = 3; // dashboardTitle contains 3 panels
  const unsavedDashboardTitle = 'New Dashboard';
  const newDashboartTitle = 'A Wild Dashboard';

  describe('dashboard unsaved listing', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('lists unsaved changes to existing dashboards', async () => {
      await dashboard.loadSavedDashboard(dashboardTitle);
      await dashboard.switchToEditMode();
      // change dashboard by adding panel
      await dashboardAddPanel.addVisualization('Rendering-Test: metric');

      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
      await dashboard.expectUnsavedChangesListingExists(dashboardTitle);
    });

    it('restores unsaved changes to existing dashboards', async () => {
      await dashboard.clickUnsavedChangesContinueEditing(dashboardTitle);
      await header.waitUntilLoadingHasFinished();
      const currentPanelCount = await dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(originalPanelCount + 1);
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
    });

    it('lists unsaved changes to new dashboards', async () => {
      await dashboard.clickNewDashboard();
      // change dashboard by adding panel
      await dashboardAddPanel.addVisualization('Rendering-Test: metric');
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
      await dashboard.expectUnsavedChangesListingExists(unsavedDashboardTitle);
    });

    it('restores unsaved changes to new dashboards', async () => {
      await dashboard.clickUnsavedChangesContinueEditing(unsavedDashboardTitle);
      await header.waitUntilLoadingHasFinished();
      expect(await dashboard.getPanelCount()).to.eql(1);
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
    });

    it('shows a warning on create new, and restores panels if continue is selected', async () => {
      await dashboard.clickNewDashboard({ continueEditing: true, expectWarning: true });
      await header.waitUntilLoadingHasFinished();
      expect(await dashboard.getPanelCount()).to.eql(1);
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
    });

    it('shows a warning on create new, and clears unsaved panels if discard is selected', async () => {
      await dashboard.clickNewDashboard({
        continueEditing: false,
        expectWarning: true,
      });
      await header.waitUntilLoadingHasFinished();
      expect(await dashboard.getPanelCount()).to.eql(0);
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
    });

    it('does not show unsaved changes on new dashboard when no panels have been added', async () => {
      await dashboard.expectUnsavedChangesListingDoesNotExist(unsavedDashboardTitle);
    });

    it('can discard unsaved changes using the discard link', async () => {
      await dashboard.clickUnsavedChangesDiscard(
        `discard-unsaved-${dashboardTitle.split(' ').join('-')}`
      );
      await dashboard.expectUnsavedChangesListingDoesNotExist(dashboardTitle);
      await dashboard.loadSavedDashboard(dashboardTitle);
      await dashboard.switchToEditMode();
      const currentPanelCount = await dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(originalPanelCount);
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
    });

    it('loses unsaved changes to new dashboard upon saving', async () => {
      await dashboard.clickNewDashboard();
      // change dashboard by adding panel
      await dashboardAddPanel.addVisualization('Rendering-Test: metric');

      // ensure that the unsaved listing exists first
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
      await dashboard.clickUnsavedChangesContinueEditing(unsavedDashboardTitle);
      await header.waitUntilLoadingHasFinished();

      // Save the dashboard, and check that it now does not exist
      await dashboard.saveDashboard(newDashboartTitle);
      await header.waitUntilLoadingHasFinished();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.expectUnsavedChangesListingDoesNotExist(unsavedDashboardTitle);
    });

    it('does not list unsaved changes when unsaved version of the dashboard is the same', async () => {
      await dashboard.loadSavedDashboard(newDashboartTitle);
      await dashboard.switchToEditMode();

      // add another panel so we can delete it later
      await dashboardAddPanel.addVisualization('Rendering-Test: heatmap');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();

      // wait for the unsaved changes badge to appear.
      await dashboard.expectUnsavedChangesBadge();

      // ensure that the unsaved listing exists
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
      await dashboard.expectUnsavedChangesListingExists(newDashboartTitle);
      await dashboard.clickUnsavedChangesContinueEditing(newDashboartTitle);
      await header.waitUntilLoadingHasFinished();

      // Remove the panel that was just added
      await dashboardPanelActions.removePanelByTitle('RenderingTest:heatmap');
      await header.waitUntilLoadingHasFinished();

      // Check that it now does not exist
      await dashboard.gotoDashboardLandingPage();
      await header.waitUntilLoadingHasFinished();
      await dashboard.expectUnsavedChangesListingDoesNotExist(newDashboartTitle);
    });
  });
}
