/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lighthouseTest, tags } from '@kbn/scout';

lighthouseTest.describe(
  'Flights dashboard: Lighthouse',
  { tag: [...tags.DEPLOYMENT_AGNOSTIC, '@perf'] },
  () => {
    lighthouseTest.beforeAll(async ({ esArchiver, kbnClient }) => {
      await esArchiver.loadIfNeeded('x-pack/performance/es_archives/sample_data_flights');
      await kbnClient.importExport.load('x-pack/performance/kbn_archives/flights_no_map_dashboard');
    });

    lighthouseTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    lighthouseTest(
      `audit '/app/dashboards#/view/7adfa750-4c81-11e8-b3d7-01146121b73d'`,
      async ({ browserAuth, lighthouse, page, pageObjects }) => {
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.dashboard.goto();
        await pageObjects.dashboard.waitForListingTableToLoad();
        await page.testSubj.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
        const currentUrl = page.url();
        // run the lighthouse audit on the current page and attach the report to the test
        await lighthouse.runAudit(currentUrl);
      }
    );
  }
);
