/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CDPSession } from '@kbn/scout';
import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { evaluateDiscoverBundlePluginAssertion } from '../fixtures/discover_bundle_expectations';
import { testData } from '../fixtures';

/**
 * Shared bundle labels produced by the unified RSPack build (split chunks + shell).
 * In RSPack dist mode, unnamed split chunks are labelled 'rspack-chunk' by
 * getLogicalBundlePluginLabel. In dev mode, named labels like 'plugin-discover' appear.
 * Named lazy split chunks (lazy_*, from dynamic import() magic comments) are handled
 * dynamically in evaluateDiscoverBundlePluginAssertion and do not need to be listed here.
 */
const SHARED_BUNDLE_LABELS: readonly string[] = [
  'core',
  'kibana',
  'one_discover_shared_deps',
  'rspack-chunk',
  'shared-core',
  'shared-misc',
  'shared-packages',
  'shared-plugins',
  'shared-root-packages',
  'shared-solution-packages',
  'vendors',
  'vendors-heavy',
];

function getExpectedDiscoverPluginIds(projectType: string | undefined): string[] {
  return [
    'aiops',
    'discover',
    'embeddable',
    'eventAnnotation',
    'expressionXY',
    'kbn-ui-shared-deps-npm',
    'kql',
    'lens',
    'maps',
    ...(projectType === 'security' ? ['securitySolution'] : []),
    'unifiedSearch',
  ];
}

/**
 * In RSPack dist mode, named plugin entry chunks (plugin-discover, etc.) are preloaded
 * during bootstrap and NOT re-fetched during SPA navigation, so only on-demand split
 * chunks with numeric IDs are captured by CDP. Per-plugin size assertions are not
 * meaningful in that mode, so only total size and bundle count are checked.
 */
const BUNDLE_SIZE_LIMITS = {
  totalSize: 3 * 1024 * 1024,
  bundleCount: 70,
} as const;

test.describe(
  'Discover App - Performance Metrics & Bundle Analysis',
  { tag: [...tags.deploymentAgnostic, ...tags.performance] },
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
      await page.testSubj.waitForSelector('homeApp', { timeout: 20000 });
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
      config,
    }) => {
      perfTracker.captureBundleResponses(cdp); // Start tracking

      // Navigate to Discover app
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();

      // Ensure all JS bundles are loaded (longer timeout to account for lazy-loaded plugins like aiops)
      await perfTracker.waitForJsLoad(cdp, 5000);

      // Collect and validate stats
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/discover#/');
      const stats = perfTracker.collectJsBundleStats(currentUrl);
      const loadedPluginNames = stats.plugins.map((p) => p.name).sort((a, b) => a.localeCompare(b));

      expect(
        stats.totalSize,
        `Total bundles size loaded on page should not exceed ${(
          BUNDLE_SIZE_LIMITS.totalSize /
          (1024 * 1024)
        ).toFixed(1)} MB`
      ).toBeLessThan(BUNDLE_SIZE_LIMITS.totalSize);
      expect(
        stats.bundleCount,
        `Total bundle chunks count loaded on page should not exceed ${BUNDLE_SIZE_LIMITS.bundleCount}`
      ).toBeLessThan(BUNDLE_SIZE_LIMITS.bundleCount);

      const expectedPlugins = getExpectedDiscoverPluginIds(config.projectType);
      // Throws with the offending bundle labels when unexpected plugins were loaded
      const onlyExpectedBundlesLoaded = evaluateDiscoverBundlePluginAssertion(
        loadedPluginNames,
        expectedPlugins,
        SHARED_BUNDLE_LABELS
      );
      expect(onlyExpectedBundlesLoaded).toBe(true);
    });

    test('measures Performance Metrics before and after Discover load', async ({
      page,
      pageObjects,
      perfTracker,
      log,
    }) => {
      const beforeMetrics = await perfTracker.capturePagePerformanceMetrics(cdp);

      // Navigate to Discover app
      await pageObjects.collapsibleNav.clickItem('Discover');
      await page.testSubj.waitForSelector('discoverLayoutResizableContainer', { timeout: 20000 });
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/discover#/');

      await pageObjects.discover.waitForHistogramRendered();

      const afterMetrics = await perfTracker.capturePagePerformanceMetrics(cdp);
      const perfStats = perfTracker.collectPagePerformanceStats(
        currentUrl,
        beforeMetrics,
        afterMetrics
      );

      log.info(`Performance Metrics for Discover app: ${JSON.stringify(perfStats, null, 2)}`);
    });
  }
);
