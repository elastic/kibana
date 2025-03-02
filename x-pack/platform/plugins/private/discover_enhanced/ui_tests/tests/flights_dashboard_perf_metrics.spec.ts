/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags, expect, CDPSession, ScoutPage } from '@kbn/scout';

async function waitForDashboardToLoad(
  page: ScoutPage,
  selector: string,
  expectedCount: number,
  timeout = 20000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const count = await page.locator(selector).count();
    if (count === expectedCount) return;
    // Short polling interval
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(250);
  }

  throw new Error(`Timeout waiting for ${expectedCount} elements matching ${selector}`);
}

test.describe(
  'Flights dashboard: CDP Performance / Network',
  { tag: [...tags.DEPLOYMENT_AGNOSTIC, '@perf'] },
  () => {
    let cdp: CDPSession;

    test.beforeAll(async ({ esArchiver, kbnClient }) => {
      await esArchiver.loadIfNeeded('x-pack/performance/es_archives/sample_data_flights');
      await kbnClient.importExport.load('x-pack/performance/kbn_archives/flights_no_map_dashboard');
    });

    test.beforeEach(async ({ browserAuth, page, context, perfTracker }) => {
      await browserAuth.loginAsPrivilegedUser();
      cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await page.gotoApp('home');
      await page.waitForLoadingIndicatorHidden();
      // wait for all the js bundles to load on Home page
      await perfTracker.waitForJsResourcesToLoad(cdp);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('collect all the JS bundles on page', async ({ page, pageObjects, perfTracker }) => {
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await pageObjects.dashboard.waitForListingTableToLoad();
      // wait for all the js bundles to load on Dashboard Listing page
      await perfTracker.waitForJsResourcesToLoad(cdp);

      // start tracking bundle responses
      const loadingBundles = perfTracker.trackBundleResponses(cdp);
      await page.testSubj.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');

      const currentUrl = page.url();
      expect(currentUrl).toContain('app/dashboards#/view');
      // wait for all the js bundles to load
      await perfTracker.waitForJsResourcesToLoad(cdp);

      // collect stats, attach them to the test and run some validations
      const stats = perfTracker.collectBundleStats(currentUrl, loadingBundles);
      expect(stats.totalSize).toBeLessThan(4 * 1024 * 1024); // 4 MB
      expect(stats.bundleCount).toBeLessThan(110);
      expect(stats.plugins.map((p) => p.name)).toStrictEqual([
        'aiops',
        'cases',
        'charts',
        'controls',
        'dashboard',
        'discover',
        'eventAnnotation',
        'expressionLegacyMetricVis',
        'expressionPartitionVis',
        'expressions',
        'expressionTagcloud',
        'expressionXY',
        'kbn-ui-shared-deps-npm',
        'kibanaReact',
        'lens',
        'maps',
        'ml',
        'presentationPanel',
        'unifiedSearch',
        'visTypeMarkdown',
        'visTypeTagcloud',
        'visTypeTimeseries',
        'visTypeXy',
        'visualizations',
      ]);
      expect(stats.plugins.find((p) => p.name === 'discover')!.totalSize).toBeLessThan(350 * 1024); // 350 KB
      expect(stats.plugins.find((p) => p.name === 'lens')!.totalSize).toBeLessThan(
        1.6 * 1024 * 1024
      ); // 1.6 MB
    });

    test('collect metrics after dashboard is loaded', async ({
      page,
      pageObjects,
      perfTracker,
    }) => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.waitForListingTableToLoad();
      await page.testSubj.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
      const before = await perfTracker.getPerformanceDomainMetrics(cdp);
      await page.waitForLoadingIndicatorHidden();
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/dashboards#/view');
      await waitForDashboardToLoad(
        page,
        '[data-test-subj="embeddablePanel"][data-render-complete="true"]',
        14
      );
      const after = await perfTracker.getPerformanceDomainMetrics(cdp);
      perfTracker.collectPerformanceStats(currentUrl, before, after);
    });
  }
);
