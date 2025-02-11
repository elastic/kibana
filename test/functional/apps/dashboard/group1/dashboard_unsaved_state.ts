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
  const { dashboard, header, visualize } = getPageObjects(['dashboard', 'header', 'visualize']);
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  let originalPanelCount = 0;
  let unsavedPanelCount = 0;
  const testQuery = 'Test Query';

  describe('dashboard unsaved state', () => {
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
      await dashboard.loadSavedDashboard('few panels');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      originalPanelCount = await dashboard.getPanelCount();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('view mode state', () => {
      before(async () => {
        await queryBar.setQuery(testQuery);
        await filterBar.addFilter({ field: 'bytes', operation: 'exists' });
        await queryBar.submitQuery();
      });

      const validateQueryAndFilter = async () => {
        const query = await queryBar.getQueryString();
        expect(query).to.eql(testQuery);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.eql(1);
      };

      it('persists after navigating to the listing page and back', async () => {
        await header.waitUntilLoadingHasFinished();
        await dashboard.gotoDashboardLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.loadSavedDashboard('few panels');
        await dashboard.waitForRenderComplete();
        await validateQueryAndFilter();
      });

      it('persists after navigating to Visualize and back', async () => {
        await header.waitUntilLoadingHasFinished();
        await visualize.gotoVisualizationLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('few panels');
        await dashboard.waitForRenderComplete();
        await validateQueryAndFilter();
      });

      it('persists after a hard refresh', async () => {
        await browser.refresh();
        const alert = await browser.getAlert();
        await alert?.accept();
        await dashboard.waitForRenderComplete();
        await validateQueryAndFilter();
      });

      it('can discard changes', async () => {
        await dashboard.clickDiscardChanges();
        await dashboard.waitForRenderComplete();

        const query = await queryBar.getQueryString();
        expect(query).to.eql('');
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.eql(0);
      });
    });

    describe('edit mode state', () => {
      it('does not show unsaved changes badge when there are no unsaved changes', async () => {
        await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
      });

      it('shows the unsaved changes badge after adding panels', async () => {
        await dashboard.switchToEditMode();
        await dashboardAddPanel.addVisualization('Rendering-Test: metric');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('dashboardUnsavedChangesBadge');
      });

      it('has correct number of panels', async () => {
        unsavedPanelCount = await dashboard.getPanelCount();
        expect(unsavedPanelCount).to.eql(originalPanelCount + 1);
      });

      it('retains unsaved panel count after navigating to listing page and back', async () => {
        await header.waitUntilLoadingHasFinished();
        await dashboard.gotoDashboardLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.loadSavedDashboard('few panels');
        const currentPanelCount = await dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(unsavedPanelCount);
      });

      it('retains unsaved panel count after navigating to another app and back', async () => {
        await header.waitUntilLoadingHasFinished();
        await visualize.gotoVisualizationLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.navigateToApp();
        if (await dashboard.onDashboardLandingPage()) {
          await testSubjects.existOrFail('unsavedDashboardsCallout');
        }
        await dashboard.loadSavedDashboard('few panels');
        const currentPanelCount = await dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(unsavedPanelCount);
      });

      it('can discard changes', async () => {
        unsavedPanelCount = await dashboard.getPanelCount();
        expect(unsavedPanelCount).to.eql(originalPanelCount + 1);

        await dashboard.clickDiscardChanges();
        const currentPanelCount = await dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(originalPanelCount);
      });

      it('resets to original panel count after switching to view mode and discarding changes', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test: metric');
        await header.waitUntilLoadingHasFinished();
        unsavedPanelCount = await dashboard.getPanelCount();
        expect(unsavedPanelCount).to.eql(originalPanelCount + 1);

        await dashboard.clickCancelOutOfEditMode();
        await header.waitUntilLoadingHasFinished();
        const currentPanelCount = await dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(originalPanelCount);
        expect(dashboard.getIsInViewMode()).to.eql(true);
      });

      it('does not show unsaved changes badge after saving', async () => {
        await dashboard.switchToEditMode();
        await dashboardAddPanel.addVisualization('Rendering-Test: metric');
        await header.waitUntilLoadingHasFinished();
        await dashboard.saveDashboard('Unsaved State Test');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
      });
    });
  });
}
