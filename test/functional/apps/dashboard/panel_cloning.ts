/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'dashboard',
    'header',
    'visualize',
    'discover',
    'timePicker',
  ]);

  describe('dashboard panel cloning', function viewEditModeTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();
      await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('clones a panel', async () => {
      const initialPanelTitles = await PageObjects.dashboard.getPanelTitles();
      await dashboardPanelActions.clonePanelByTitle(PIE_CHART_VIS_NAME);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const postPanelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(postPanelTitles.length).to.equal(initialPanelTitles.length + 1);
    });

    it('appends a clone title tag', async () => {
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(panelTitles[1]).to.equal(PIE_CHART_VIS_NAME + ' (copy)');
    });

    it('retains original panel dimensions', async () => {
      const panelDimensions = await PageObjects.dashboard.getPanelDimensions();
      expect(panelDimensions[0]).to.eql(panelDimensions[1]);
    });

    it('clone of a by reference embeddable is by value', async () => {
      const panelName = PIE_CHART_VIS_NAME.replace(/\s+/g, '');
      const clonedPanel = await testSubjects.find(`embeddablePanelHeading-${panelName}(copy)`);
      const descendants = await testSubjects.findAllDescendant(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        clonedPanel
      );
      expect(descendants.length).to.equal(0);
    });

    it('gives a correct title to the clone of a clone', async () => {
      const initialPanelTitles = await PageObjects.dashboard.getPanelTitles();
      const clonedPanelName = initialPanelTitles[initialPanelTitles.length - 1];
      await dashboardPanelActions.clonePanelByTitle(clonedPanelName);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const postPanelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(postPanelTitles.length).to.equal(initialPanelTitles.length + 1);
      expect(postPanelTitles[postPanelTitles.length - 1]).to.equal(
        PIE_CHART_VIS_NAME + ' (copy 1)'
      );
    });

    it('clone of a by value embeddable is by value', async () => {
      const panelName = PIE_CHART_VIS_NAME.replace(/\s+/g, '');
      const clonedPanel = await testSubjects.find(`embeddablePanelHeading-${panelName}(copy1)`);
      const descendants = await testSubjects.findAllDescendant(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        clonedPanel
      );
      expect(descendants.length).to.equal(0);
    });
  });
}
