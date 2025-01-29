/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  kbnArchives: ['x-pack/performance/kbn_archives/promotion_tracking_dashboard'],
  esArchives: ['x-pack/performance/es_archives/sample_data_ecommerce'],
  scalabilitySetup: {
    warmup: [
      {
        action: 'constantConcurrentUsers',
        userCount: 10,
        duration: '30s',
      },
      {
        action: 'rampConcurrentUsers',
        minUsersCount: 10,
        maxUsersCount: 50,
        duration: '2m',
      },
    ],
    test: [
      {
        action: 'constantConcurrentUsers',
        userCount: 50,
        duration: '5m',
      },
    ],
    maxDuration: '10m',
  },
})
  .step('Go to Dashboards Page', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await kibanaPage.waitForListViewTable();
  })

  .step('Go to Promotion Tracking Dashboard', async ({ page }) => {
    await page.click(subj('dashboardListingTitleLink-Promotion-Dashboard'));
  })

  .step('Change time range', async ({ page }) => {
    await page.click(subj('superDatePickerToggleQuickMenuButton'));
    await page.click(subj('superDatePickerCommonlyUsed_Last_30 days'));
  })

  .step('Wait for visualization animations to finish', async ({ kibanaPage }) => {
    await kibanaPage.waitForVisualizations({ count: 1 });
  });
