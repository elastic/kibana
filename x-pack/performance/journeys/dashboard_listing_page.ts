/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_flights'],
  kbnArchives: [
    'x-pack/performance/kbn_archives/flights_no_map_dashboard',
    'x-pack/performance/kbn_archives/logs_no_map_dashboard',
  ],
}).step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
  await page.goto(kbnUrl.get(`/app/dashboards`));
  await page.waitForSelector(`[data-test-subj="table-is-ready"]`);
});
