/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_logs'],
  kbnArchives: ['x-pack/performance/kbn_archives/logs_no_map_dashboard_esql'],
})

  .step('Go to Dashboards Page', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await kibanaPage.waitForListViewTable();
  })

  .step('Go to Web Logs Dashboard', async ({ page, kibanaPage }) => {
    await page.click(subj('dashboardListingTitleLink-Logs-dashboard-with-ES|QL'));
    await kibanaPage.waitForVisualizations({ count: 11 });
  });
