/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags, expect, CDPSession } from '@kbn/scout';
import { testData } from '../fixtures';

test.describe('Discover app performance', { tag: [...tags.DEPLOYMENT_AGNOSTIC, '@perf'] }, () => {
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
    await browserAuth.loginAsPrivilegedUser();
    cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await page.gotoApp('home');
    await page.waitForLoadingIndicatorHidden();
    // wait for all the js bundles to load on Home page
    await perfTracker.waitForJsResourcesToLoad(cdp);
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('collect all JS bundles with CDP', async ({ page, pageObjects, perfTracker }) => {
    // start tracking bundle responses
    const loadingBundles = perfTracker.trackBundleResponses(cdp);
    // navigate to Discover app from left menu on Home page
    await pageObjects.collapsibleNav.clickItem('Discover');
    const currentUrl = page.url();
    expect(currentUrl).toContain('app/discover#/');
    // wait for all the js bundles to load
    await perfTracker.waitForJsResourcesToLoad(cdp);

    // collect stats, attach them to the test and run some validations
    const stats = perfTracker.collectStats(currentUrl, loadingBundles);
    expect(stats.totalSize).toBeLessThan(3.5 * 1024 * 1024); // 3.5 MB
    expect(stats.bundleCount).toBeLessThan(90);
    expect(stats.plugins.map((p) => p.name)).toStrictEqual([
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
  });
});
