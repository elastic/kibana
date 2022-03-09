/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'dashboard',
    'header',
    'common',
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
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
      await PageObjects.dashboard.saveDashboard('legacyTest', { waitDialogIsClosed: true });
      await PageObjects.header.waitUntilLoadingHasFinished();
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
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.deleteItem('legacyTest', testDashboardId);
      await security.testUser.restoreDefaults();
    });

    describe('kibana link redirect', () => {
      it('redirects from old kibana app URL', async () => {
        const url = `${kibanaLegacyBaseUrl}#/dashboard/${testDashboardId}`;
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.timePicker.setDefaultDataRange();

        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });

      it('redirects from legacy hash in wrong app', async () => {
        const url = `${kibanaVisualizeBaseUrl}#/dashboard/${testDashboardId}`;
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.timePicker.setDefaultDataRange();

        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });

      it('resolves markdown link', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickMarkdownWidget();
        await PageObjects.visEditor.setMarkdownTxt(`[abc](#/dashboard/${testDashboardId})`);
        await PageObjects.visEditor.clickGo();

        await PageObjects.visualize.saveVisualizationExpectSuccess('legacy url markdown');

        (await find.byLinkText('abc')).click();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.timePicker.setDefaultDataRange();

        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });

      it('back button works', async () => {
        // back to default time range
        await browser.goBack();
        // back to last app
        await browser.goBack();
        await PageObjects.visEditor.expectMarkdownTextArea();
        await browser.goForward();
      });

      it('resolves markdown link from dashboard', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await dashboardAddPanel.addVisualization('legacy url markdown');
        (await find.byLinkText('abc')).click();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.timePicker.setDefaultDataRange();

        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(5);
      });
    });
  });
}
