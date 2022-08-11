/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  PIE_CHART_VIS_NAME,
  AREA_CHART_VIS_NAME,
  LINE_CHART_VIS_NAME,
} from '../../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardReplacePanel = getService('dashboardReplacePanel');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects([
    'dashboard',
    'header',
    'visualize',
    'discover',
    'timePicker',
  ]);

  describe('replace dashboard panels', function viewEditModeTests() {
    let intialDimensions: undefined | Array<{ width: number; height: number }>;

    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();
      await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
      await dashboardAddPanel.addVisualization(LINE_CHART_VIS_NAME);
      intialDimensions = await PageObjects.dashboard.getPanelDimensions();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('replaces old panel with selected panel', async () => {
      await dashboardPanelActions.replacePanelByTitle(PIE_CHART_VIS_NAME);
      await dashboardReplacePanel.replaceEmbeddable(AREA_CHART_VIS_NAME);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(panelTitles.length).to.be(2);
      expect(panelTitles[0]).to.be(AREA_CHART_VIS_NAME);
      const newDimensions = await PageObjects.dashboard.getPanelDimensions();
      expect(intialDimensions![0]).to.eql(newDimensions[0]);
    });

    it('replaced panel persisted correctly when dashboard is hard refreshed', async () => {
      const currentUrl = await browser.getCurrentUrl();
      await browser.get(currentUrl, true);
      const alert = await browser.getAlert();
      await alert?.accept();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(panelTitles.length).to.be(2);
      expect(panelTitles[0]).to.be(AREA_CHART_VIS_NAME);
    });

    it('replaced panel with saved search', async () => {
      const replacedSearch = 'replaced saved search';
      await dashboardVisualizations.createSavedSearch({
        name: replacedSearch,
        fields: ['bytes', 'agent'],
      });
      await PageObjects.header.clickDashboard();
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await dashboardPanelActions.replacePanelByTitle(AREA_CHART_VIS_NAME);
      await dashboardReplacePanel.replaceEmbeddable(replacedSearch, 'search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(panelTitles.length).to.be(2);
      expect(panelTitles[0]).to.be(replacedSearch);
    });
  });
}
