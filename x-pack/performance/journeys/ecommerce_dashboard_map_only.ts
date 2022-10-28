/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_ecommerce'],
  kbnArchives: ['x-pack/performance/kbn_archives/ecommerce_map_only_dashboard'],
})

  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector('#dashboardListingHeading');
  })

  .step('Go to Ecommerce No Map Dashboard', async ({ page, kbnUrl }) => {
    await page.click(subj('dashboardListingTitleLink-[eCommerce]-Map-Only'));
    await page.waitForSelector(
      'div[data-title="[eCommerce] Orders by Country"][data-render-complete="true"]'
    );
  });
