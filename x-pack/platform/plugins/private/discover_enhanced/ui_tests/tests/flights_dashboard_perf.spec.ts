/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  test,
  tags,
  trackBundleSizes,
  waitForJsBundles,
  savePageBundleStats,
  expect,
} from '@kbn/scout';

test.describe('Flights dashboard performance', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded('x-pack/performance/es_archives/sample_data_flights');
    await kbnClient.importExport.load('x-pack/performance/kbn_archives/flights_no_map_dashboard');
  });

  test.beforeEach(async ({ browserAuth, page, context }) => {
    await browserAuth.loginAsPrivilegedUser();
    const cdpClient = await context.newCDPSession(page);
    await cdpClient.send('Network.enable');
    await page.gotoApp('home');
    await page.waitForLoadingIndicatorHidden();
    await waitForJsBundles(cdpClient);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('Measure JS bundle sizes with CDP', async ({ context, page, pageObjects, log, config }) => {
    const cdpClient = await context.newCDPSession(page);
    await cdpClient.send('Network.enable');
    await pageObjects.collapsibleNav.clickItem('Dashboards');
    await pageObjects.dashboard.waitForListingTableToLoad();
    await waitForJsBundles(cdpClient);

    // start tracking bundle sizes before clicking the dashboard link
    const { bundleResponses } = trackBundleSizes(cdpClient);
    await page.testSubj.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
    const currentUrl = page.url();
    expect(currentUrl).toContain('app/dashboards#/view');
    // wait for the dashboard bundles to load
    await waitForJsBundles(cdpClient);

    const distro = config.serverless ? config.projectType! : 'stateful';
    savePageBundleStats(bundleResponses, `flights-dashboard-${distro}`, currentUrl, log);
  });
});
