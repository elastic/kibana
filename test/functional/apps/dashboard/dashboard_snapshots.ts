/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'common', 'timePicker']);
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard snapshots', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      // We use a really small window to minimize differences across os's and browsers.
      await browser.setScreenshotSize(1000, 500);
      // adding this navigate adds the timestamp hash to the url which invalidates previous
      // session.  If we don't do this, the colors on the visualizations are different and the screenshots won't match.
      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async function () {
      await browser.setWindowSize(1300, 900);
    });

    it('compare TSVB snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setLogstashDataRange();
      await dashboardAddPanel.addVisualization('Rendering Test: tsvb-ts');
      await PageObjects.common.closeToastIfExists();

      await PageObjects.dashboard.saveDashboard('tsvb');
      await PageObjects.dashboard.clickFullScreenMode();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      await PageObjects.dashboard.waitForRenderComplete();
      const percentDifference = await screenshot.compareAgainstBaseline(
        'tsvb_dashboard',
        updateBaselines
      );

      await PageObjects.dashboard.clickExitFullScreenLogoButton();
      expect(percentDifference).to.be.lessThan(0.02);
    });

    it('compare area chart snapshot', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setLogstashDataRange();
      await dashboardAddPanel.addVisualization('Rendering Test: area with not filter');
      await PageObjects.common.closeToastIfExists();

      await PageObjects.dashboard.saveDashboard('area');
      await PageObjects.dashboard.clickFullScreenMode();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      await PageObjects.dashboard.waitForRenderComplete();
      const percentDifference = await screenshot.compareAgainstBaseline(
        'area_chart',
        updateBaselines
      );

      await PageObjects.dashboard.clickExitFullScreenLogoButton();
      expect(percentDifference).to.be.lessThan(0.02);
    });
  });
}
