/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const PageObjects = getPageObjects([
    'dashboard',
    'dashboardControls',
    'header',
    'visualize',
    'common',
    'timePicker',
  ]);
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard snapshots', function describeIndexTests() {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
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
      await kibanaServer.savedObjects.cleanStandardList();
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
      expect(percentDifference).to.be.lessThan(0.022);
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
      expect(percentDifference).to.be.lessThan(0.029);
    });

    describe('compare controls snapshot', async () => {
      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'machine.os.raw',
          title: 'Machine OS',
        });
        await PageObjects.dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'bytes',
          title: 'Bytes',
        });
        await PageObjects.dashboard.saveDashboard('Dashboard Controls');
      });

      it('in light mode', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline(
          'dashboard_controls_light',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.06);
      });

      it('in dark mode', async () => {
        await kibanaServer.uiSettings.update({
          'theme:darkMode': true,
        });
        await browser.refresh();
        await PageObjects.dashboard.waitForRenderComplete();

        const percentDifference = await screenshot.compareAgainstBaseline(
          'dashboard_controls_dark',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.07);
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          'theme:darkMode': false,
        });
        await browser.refresh();
      });
    });
  });
}
