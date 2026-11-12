/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTENT_LIST_TEST_SUBJECTS,
  getContentListSelectionBarSubjects,
  getContentListToolbarSubjects,
} from '@kbn/content-list-common';
import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { v4 as uuidv4 } from 'uuid';

const toolbarSubjects = getContentListToolbarSubjects();
const selectionBarSubjects = getContentListSelectionBarSubjects(toolbarSubjects.selectionBar);

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_flights_many_fields'],
  kbnArchives: [
    'x-pack/performance/kbn_archives/flights_no_map_dashboard',
    'x-pack/performance/kbn_archives/logs_no_map_dashboard',
  ],
})
  .step('Go to Dashboards Page', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await kibanaPage.waitForListViewTable();
  })
  .step('Search dashboards', async ({ page, inputDelays }) => {
    // Free-text search is debounced, so the table can still be showing unfiltered
    // results when typing returns. Waiting for it to look idle would then pass on
    // the pre-search table; wait for a row that cannot match to go instead.
    const filteredOut = page.locator(subj(CONTENT_LIST_TEST_SUBJECTS.table)).getByRole('link', {
      name: '[Flights] Global Flight Dashboard',
      exact: true,
    });

    const searchBox = page.locator(subj(toolbarSubjects.searchBox));
    await searchBox.pressSequentially('Web', {
      delay: inputDelays.TYPING,
    });
    await filteredOut.waitFor({ state: 'detached' });
  })
  .step('Delete dashboard', async ({ page, kibanaPage }) => {
    const deletedDashboard = page
      .locator(subj(CONTENT_LIST_TEST_SUBJECTS.table))
      .getByRole('link', {
        name: '[Logs] Web Traffic',
        exact: true,
      })
      .locator('xpath=ancestor::tr');
    await deletedDashboard.getByRole('checkbox').click();
    await page.click(subj(selectionBarSubjects.deleteButton));
    await page.click(subj('confirmModalConfirmButton'));
    await kibanaPage.waitForListViewTable();
    await deletedDashboard.waitFor({ state: 'detached' });
  })
  .step('Add dashboard', async ({ page, inputDelays }) => {
    await page.click(subj('dashboardListingCreateButton'));
    await page.click(subj('dashboardInteractiveSaveMenuItem'));
    await page.type(subj('savedObjectTitle'), `foobar dashboard ${uuidv4()}`, {
      delay: inputDelays.TYPING,
    });
    await page.click(subj('confirmSaveSavedObjectButton'));
    await page.waitForSelector(subj('saveDashboardSuccess'));
  })
  .step('Return to dashboard list', async ({ kibanaPage }) => {
    await kibanaPage.backToDashboardListing();
    await kibanaPage.waitForListViewTable();
  });
