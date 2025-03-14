/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, timePicker, visualize, visEditor } = getPageObjects([
    'dashboard',
    'header',
    'timePicker',
    'visualize',
    'visEditor',
  ]);
  const pieChart = getService('pieChart');
  const browser = getService('browser');
  const find = getService('find');
  const log = getService('log');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const elasticChart = getService('elasticChart');

  let kibanaLegacyBaseUrl: string;
  let kibanaVisualizeBaseUrl: string;
  let testDashboardId: string;

  describe('legacy urls', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
      await dashboard.saveDashboard('legacyTest', {
        waitDialogIsClosed: true,
        saveAsNew: true,
      });
      await header.waitUntilLoadingHasFinished();
      const currentUrl = await browser.getCurrentUrl();
      await log.debug(`Current url is ${currentUrl}`);
      testDashboardId = /#\/view\/(.+)\?/.exec(currentUrl)![1];
      kibanaLegacyBaseUrl =
        currentUrl.substring(0, currentUrl.indexOf('/app/dashboards')) + '/app/kibana';
      kibanaVisualizeBaseUrl =
        currentUrl.substring(0, currentUrl.indexOf('/app/dashboards')) + '/app/visualize';
      await log.debug(`id is ${testDashboardId}`);
    });

    after(async function () {
      await dashboard.gotoDashboardLandingPage();
      await listingTable.deleteItem('legacyTest', testDashboardId);
      await security.testUser.restoreDefaults();
    });

    describe('kibana link redirect', () => {
      it('redirects from old kibana app URL', async () => {
        const url = `${kibanaLegacyBaseUrl}#/dashboard/${testDashboardId}`;
        await browser.get(url, true);
        await header.waitUntilLoadingHasFinished();
        await elasticChart.setNewChartUiDebugFlag(true);
        await timePicker.setDefaultDataRange();

        await dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });

      it('redirects from legacy hash in wrong app', async () => {
        const url = `${kibanaVisualizeBaseUrl}#/dashboard/${testDashboardId}`;
        await browser.get(url, true);
        await elasticChart.setNewChartUiDebugFlag(true);
        await header.waitUntilLoadingHasFinished();
        await timePicker.setDefaultDataRange();

        await dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });

      it('resolves markdown link', async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await dashboardAddPanel.clickAddMarkdownPanel();
        await visEditor.setMarkdownTxt(`[abc](#/dashboard/${testDashboardId})`);
        await visEditor.clickGo();
        await visualize.saveVisualization('legacy url markdown', { redirectToOrigin: true });
        await (await find.byLinkText('abc')).click();

        await header.waitUntilLoadingHasFinished();
        await timePicker.setDefaultDataRange();

        await dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });

      it('back button works', async () => {
        // back to default time range
        await browser.goBack();
        // back to last app
        await browser.goBack();
        await visEditor.expectMarkdownTextArea();
        await browser.goForward();
      });

      it('resolves markdown link from dashboard', async () => {
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();
        await dashboardAddPanel.addVisualization('legacy url markdown');
        await (await find.byLinkText('abc')).click();
        await header.waitUntilLoadingHasFinished();
        await elasticChart.setNewChartUiDebugFlag(true);
        await timePicker.setDefaultDataRange();

        await dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });
    });
  });
}
