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
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  let originalPanelCount = 0;
  let unsavedPanelCount = 0;

  // FLAKY: https://github.com/elastic/kibana/issues/91191
  describe.skip('dashboard unsaved panels', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.header.waitUntilLoadingHasFinished();
      originalPanelCount = await PageObjects.dashboard.getPanelCount();
    });

    it('does not show unsaved changes badge when there are no unsaved changes', async () => {
      await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
    });

    it('shows the unsaved changes badge after adding panels', async () => {
      await PageObjects.dashboard.switchToEditMode();
      // add an area chart by value
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAggBasedVisualizations();
      await PageObjects.visualize.clickAreaChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.visualize.saveVisualizationAndReturn();

      // add a metric by reference
      await dashboardAddPanel.addVisualization('Rendering-Test: metric');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('dashboardUnsavedChangesBadge');
    });

    it('has correct number of panels', async () => {
      unsavedPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(unsavedPanelCount).to.eql(originalPanelCount + 2);
    });

    it('retains unsaved panel count after navigating to listing page and back', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
      const currentPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(unsavedPanelCount);
    });

    it('retains unsaved panel count after navigating to another app and back', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.navigateToApp('dashboards');
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
      const currentPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(unsavedPanelCount);
    });

    it('resets to original panel count upon entering view mode', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.clickCancelOutOfEditMode();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const currentPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(originalPanelCount);
    });

    it('shows unsaved changes badge in view mode if changes have not been discarded', async () => {
      await testSubjects.existOrFail('dashboardUnsavedChangesBadge');
    });

    it('retains unsaved panel count after returning to edit mode', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const currentPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(currentPanelCount).to.eql(unsavedPanelCount);
    });

    it('does not show unsaved changes badge after saving', async () => {
      await PageObjects.dashboard.saveDashboard('Unsaved State Test');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
    });
  });
}
