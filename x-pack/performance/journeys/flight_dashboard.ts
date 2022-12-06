/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { waitForVisualizations } from '../utils';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_flights'],
  kbnArchives: ['x-pack/performance/kbn_archives/flights_no_map_dashboard'],
})

  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector('#dashboardListingHeading');
  })

  .step('Go to Flights Dashboard', async ({ page, log }) => {
    await page.click(subj('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard'));
    await waitForVisualizations(page, log, 14);
  });
