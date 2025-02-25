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
import { testData } from '../fixtures';

test.describe('Discover app performance', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
    await uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
    });
  });

  test.beforeEach(async ({ browserAuth, page, context }) => {
    await browserAuth.loginAsPrivilegedUser();
    const cdpClient = await context.newCDPSession(page);
    await cdpClient.send('Network.enable');
    await page.gotoApp('home');
    await page.waitForLoadingIndicatorHidden();
    await waitForJsBundles(cdpClient);
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('Measure JS bundle sizes with CDP', async ({ context, page, pageObjects, log, config }) => {
    const cdpClient = await context.newCDPSession(page);
    await cdpClient.send('Network.enable');
    const { bundleResponses } = trackBundleSizes(cdpClient);

    await pageObjects.collapsibleNav.clickItem('Discover');
    const currentUrl = page.url();
    expect(currentUrl).toContain('app/discover#/');
    await waitForJsBundles(cdpClient);

    const distro = config.serverless ? config.projectType! : 'stateful';
    savePageBundleStats(bundleResponses, `discover-app-${distro}`, currentUrl, log);
  });
});
