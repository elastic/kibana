/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const { dashboard, dashboardControls, header, timePicker } = getPageObjects([
    'dashboard',
    'dashboardControls',
    'header',
    'timePicker',
  ]);
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

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
      await dashboard.navigateToApp();
    });

    after(async function () {
      await browser.setWindowSize(1300, 900);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('compare TSVB snapshot', async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setLogstashDataRange();
      await dashboardAddPanel.addVisualization('Rendering Test: tsvb-ts');
      await toasts.dismissIfExists();

      await dashboard.saveDashboard('tsvb');
      await dashboard.clickFullScreenMode();
      await dashboardPanelActions.clickExpandPanelToggle();

      await dashboard.waitForRenderComplete();
      const percentDifference = await screenshot.compareAgainstBaseline(
        'tsvb_dashboard',
        updateBaselines
      );

      await dashboard.clickExitFullScreenLogoButton();
      expect(percentDifference).to.be.lessThan(0.022);
    });

    it('compare area chart snapshot', async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setLogstashDataRange();
      await dashboardAddPanel.addVisualization('Rendering Test: area with not filter');
      await toasts.dismissIfExists();

      await dashboard.saveDashboard('area');
      await dashboard.clickFullScreenMode();
      await dashboardPanelActions.clickExpandPanelToggle();

      await dashboard.waitForRenderComplete();
      const percentDifference = await screenshot.compareAgainstBaseline(
        'area_chart',
        updateBaselines
      );

      await dashboard.clickExitFullScreenLogoButton();
      expect(percentDifference).to.be.lessThan(0.029);
    });

    describe('compare controls snapshot', () => {
      const waitForPageReady = async () => {
        await header.waitUntilLoadingHasFinished();
        await retry.waitFor('page ready for screenshot', async () => {
          const queryBarVisible = await testSubjects.exists('globalQueryBar');
          const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
          return queryBarVisible && controlGroupVisible;
        });
      };

      before(async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'machine.os.raw',
          title: 'Machine OS',
        });
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'bytes',
          title: 'Bytes',
        });
        await dashboard.saveDashboard('Dashboard Controls');
      });

      it('in light mode', async () => {
        await waitForPageReady();
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
        await waitForPageReady();
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
