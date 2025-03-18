/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags, expect, CDPSession } from '@kbn/scout';
import { testData } from '../fixtures';

test.describe(
  'Discover App - Performance Metrics & Bundle Analysis',
  { tag: [...tags.DEPLOYMENT_AGNOSTIC, ...tags.PERFORMANCE] },
  () => {
    let cdp: CDPSession;

    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
      });
    });

    test.beforeEach(async ({ browserAuth, page, context, perfTracker }) => {
      await browserAuth.loginAsAdmin();
      cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await page.gotoApp('home');
      await page.waitForLoadingIndicatorHidden();
      await perfTracker.waitForJsLoad(cdp); // Ensure JS bundles are fully loaded
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('collects and validates JS Bundles loaded on page', async ({
      page,
      pageObjects,
      perfTracker,
    }) => {
      perfTracker.captureBundleResponses(cdp); // Start tracking

      // Navigate to Discover app
      await pageObjects.collapsibleNav.clickItem('Discover');
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/discover#/');

      // Ensure all JS bundles are loaded
      await perfTracker.waitForJsLoad(cdp);

      // Collect and validate stats
      const stats = perfTracker.collectJsBundleStats(currentUrl);
      expect(
        stats.totalSize,
        `Total bundles size loaded on page should not exceed 3.1 MB`
      ).toBeLessThan(3.1 * 1024 * 1024);
      expect(
        stats.bundleCount,
        `Total bundle chunks count loaded on page should not exceed 100`
      ).toBeLessThan(100);
      expect(
        stats.plugins.map((p) => p.name),
        'Unexpected plugins were loaded on page'
      ).toStrictEqual([
        'aiops',
        'discover',
        'eventAnnotation',
        'expressionXY',
        'kbn-ui-shared-deps-npm',
        'lens',
        'maps',
        'unifiedHistogram',
        'unifiedSearch',
      ]);
      // Validate individual plugin bundle sizes
      expect(
        stats.plugins.find((p) => p.name === 'discover')?.totalSize,
        `Total 'discover' bundles size should not exceed 650 KB`
      ).toBeLessThan(650 * 1024);
      expect(
        stats.plugins.find((p) => p.name === 'unifiedHistogram')?.totalSize,
        `Total 'unifiedHistogram' bundles size should not exceed 150 KB`
      ).toBeLessThan(150 * 1024);
      expect(
        stats.plugins.find((p) => p.name === 'unifiedSearch')?.totalSize,
        `Total 'unifiedSearch' bundles size should not exceed 450 KB`
      ).toBeLessThan(450 * 1024);
    });

    test('measures Performance Metrics before and after Discover load', async ({
      page,
      pageObjects,
      perfTracker,
    }) => {
      const beforeMetrics = await perfTracker.capturePagePerformanceMetrics(cdp);

      // Navigate to Discover app
      await pageObjects.collapsibleNav.clickItem('Discover');
      await page.waitForLoadingIndicatorHidden();
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/discover#/');

      await pageObjects.discover.waitForHistogramRendered();

      const afterMetrics = await perfTracker.capturePagePerformanceMetrics(cdp);
      const perfStats = perfTracker.collectPagePerformanceStats(
        currentUrl,
        beforeMetrics,
        afterMetrics
      );

      expect(
        perfStats.cpuTime.diff,
        'CPU time (seconds) usage during page navigation should not exceed 2 seconds'
      ).toBeLessThan(2);
      expect(
        perfStats.scriptTime.diff,
        'Additional time spent executing JS scripts should not exceed 0.5 second'
      ).toBeLessThan(0.5);
      expect(
        perfStats.layoutTime.diff,
        'Total layout computation time should not exceed 0.1 second'
      ).toBeLessThan(0.06);
    });
  }
);
