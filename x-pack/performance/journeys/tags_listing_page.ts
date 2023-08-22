/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

const TEST_TAG = 'testing';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_flights'],
  kbnArchives: ['x-pack/performance/kbn_archives/many_tags_and_visualizations'],
})
  .step('Go to Tags Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/management/kibana/tags`));
    await page.waitForSelector(subj('table-is-ready'));
  })
  .step('Search tag', async ({ page, inputDelays }) => {
    await page.type(subj('tagsManagementSearchBar'), 'stream', {
      delay: inputDelays.TYPING,
    });
    await page.waitForSelector(subj('table-is-ready'));
  })
  .step('Create tag', async ({ page, inputDelays, kibanaPage }) => {
    await kibanaPage.clearInput(subj('tagsManagementSearchBar'));
    await page.waitForSelector(subj('table-is-ready'));
    await page.click(subj('createTagButton'));
    await page.type(subj('createModalField-name'), TEST_TAG, { delay: inputDelays.TYPING });
    const createButton = page.locator(subj('createModalConfirmButton'));
    await createButton.click();
    await createButton.waitFor({ state: 'detached' });
    await page.waitForSelector(subj('table-is-ready'));

    await page.type(subj('tagsManagementSearchBar'), TEST_TAG, {
      delay: inputDelays.TYPING,
    });
    await page.waitForSelector(subj('table-is-ready'));
    await page.waitForSelector(subj('tagsTableRowName'), { state: 'visible' });
  })
  .step('Delete tag', async ({ page }) => {
    const tagRow = page.locator(subj('tagsTableRowName'));
    await page.click(subj('euiCollapsedItemActionsButton'));
    await page.click(subj('tagsTableAction-delete'));
    await page.click(subj('confirmModalConfirmButton'));
    await page.waitForSelector(subj('table-is-ready'));
    await tagRow.waitFor({ state: 'detached' });
  });
