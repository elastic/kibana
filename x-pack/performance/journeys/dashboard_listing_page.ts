/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { v4 as uuidv4 } from 'uuid';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_flights'],
  kbnArchives: [
    'x-pack/performance/kbn_archives/flights_no_map_dashboard',
    'x-pack/performance/kbn_archives/logs_no_map_dashboard',
  ],
})
  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector(subj('table-is-ready'));
  })
  .step('Search dashboards', async ({ page, inputDelays }) => {
    await page.type(subj('tableListSearchBox'), 'Web', {
      delay: inputDelays.TYPING,
    });
    await page.waitForSelector(subj('table-is-ready'));
  })
  .step('Delete dashboard', async ({ page }) => {
    await page.click(subj('checkboxSelectRow-edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b'));
    await page.click(subj('deleteSelectedItems'));
    await page.click(subj('confirmModalConfirmButton'));
    await page.waitForSelector(subj('table-is-ready'));
  })
  .step('Add  dashboard', async ({ page, inputDelays }) => {
    await page.click(subj('newItemButton'));
    await page.click(subj('dashboardSaveMenuItem'));
    await page.type(subj('savedObjectTitle'), `foobar dashboard ${uuidv4()}`, {
      delay: inputDelays.TYPING,
    });
    await page.click(subj('confirmSaveSavedObjectButton'));
    await page.waitForSelector(subj('saveDashboardSuccess'));
  })
  .step('Return to dashboard list', async ({ kibanaPage, page }) => {
    kibanaPage.backToDashboardListing();
    await page.waitForSelector(subj('table-is-ready'));
  });
