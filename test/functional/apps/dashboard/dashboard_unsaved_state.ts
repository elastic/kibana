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
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  let originalPanelCount = 0;
  let unsavedPanelCount = 0;
  const testQuery = 'Test Query';

  // FLAKY https://github.com/elastic/kibana/issues/112812
  describe.skip('dashboard unsaved state', () => {
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
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      originalPanelCount = await PageObjects.dashboard.getPanelCount();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('view mode state', () => {
      before(async () => {
        await queryBar.setQuery(testQuery);
        await filterBar.addFilter('bytes', 'exists');
        await queryBar.submitQuery();
      });

      const validateQueryAndFilter = async () => {
        const query = await queryBar.getQueryString();
        expect(query).to.eql(testQuery);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.eql(1);
      };

      it('persists after navigating to the listing page and back', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.loadSavedDashboard('few panels');
        await PageObjects.dashboard.waitForRenderComplete();
        await validateQueryAndFilter();
      });

      it('persists after navigating to Visualize and back', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.common.navigateToApp('dashboards');
        await PageObjects.dashboard.loadSavedDashboard('few panels');
        await PageObjects.dashboard.waitForRenderComplete();
        await validateQueryAndFilter();
      });

      it('persists after a hard refresh', async () => {
        await browser.refresh();
        const alert = await browser.getAlert();
        await alert?.accept();
        await PageObjects.dashboard.waitForRenderComplete();
        await validateQueryAndFilter();
      });

      after(async () => {
        // discard changes made in view mode
        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.dashboard.clickCancelOutOfEditMode();
      });
    });

    describe('edit mode state', () => {
      const addPanels = async () => {
        // add an area chart by value
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAggBasedVisualizations();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.saveVisualizationAndReturn();

        // add a metric by reference
        await dashboardAddPanel.addVisualization('Rendering-Test: metric');
      };

      it('does not show unsaved changes badge when there are no unsaved changes', async () => {
        await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
      });

      it('shows the unsaved changes badge after adding panels', async () => {
        await PageObjects.dashboard.switchToEditMode();
        await addPanels();
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
        const currentPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(unsavedPanelCount);
      });

      it('retains unsaved panel count after navigating to another app and back', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.common.navigateToApp('dashboards');
        await PageObjects.dashboard.loadSavedDashboard('few panels');
        const currentPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(unsavedPanelCount);
      });

      it('resets to original panel count after discarding changes', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.clickCancelOutOfEditMode();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const currentPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(currentPanelCount).to.eql(originalPanelCount);
        expect(PageObjects.dashboard.getIsInViewMode()).to.eql(true);
      });

      it('does not show unsaved changes badge after saving', async () => {
        await PageObjects.dashboard.switchToEditMode();
        await addPanels();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.saveDashboard('Unsaved State Test');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
      });
    });
  });
}
