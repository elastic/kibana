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
})
  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector(`[data-test-subj="table-is-ready"]`);
  })
  .step('Search dashboards page', async ({ page, inputDelays }) => {
    await page.type('[data-test-subj="tableListSearchBox"]', 'Web', {
      delay: inputDelays.TYPING,
    });
    await page.waitForSelector(`[data-test-subj="table-is-ready"]`);
  })
  .step('Clear the search', async ({ page, inputDelays }) => {
    await page.click('[data-test-subj="tableListSearchBox"]');
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForSelector(`[data-test-subj="table-is-ready"]`);
  })
  .step('Delete dashboard', async ({ page, log }) => {
    await page.click('[data-test-subj="checkboxSelectRow-7adfa750-4c81-11e8-b3d7-01146121b73d"]');
    await page.click('[data-test-subj="deleteSelectedItems"]');
    await page.click('[data-test-subj="confirmModalConfirmButton"]');
    await page.waitForSelector(`[data-test-subj="table-is-ready"]`);
  });
