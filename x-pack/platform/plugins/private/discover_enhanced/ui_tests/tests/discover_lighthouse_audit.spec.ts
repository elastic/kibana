/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lighthouseTest, tags } from '@kbn/scout';
import { testData } from '../fixtures';

lighthouseTest.describe(
  'Discover app: Lighthouse',
  { tag: [...tags.DEPLOYMENT_AGNOSTIC, '@perf'] },
  () => {
    lighthouseTest.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
      });
    });

    lighthouseTest.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    lighthouseTest(
      `audit '/app/discover'`,
      async ({ browserAuth, lighthouse, page, pageObjects }, testInfo) => {
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.discover.goto();
        await pageObjects.discover.waitForHistogramRendered();
        const currentUrl = page.url();

        const result = await lighthouse.runAudit(currentUrl);
        // attach the report to the test
        testInfo.attach('lighthouse-report', { body: result.report[0], contentType: 'text/html' });
      }
    );
  }
);
