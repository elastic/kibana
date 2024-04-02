/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

const TAG_NAME = 'testing';
const TAG_DESCRIPTION = 'test description';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_flights'],
  kbnArchives: ['x-pack/performance/kbn_archives/many_tags_and_visualizations'],
})
  .step('Go to Tags Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/management/kibana/tags`));
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
  })
  .step('Delete the first 20 tags', async ({ page }) => {
    await page.click(subj('checkboxSelectAll'));
    await page.click(subj('actionBar-contextMenuButton'));
    await page.click(subj('actionBar-button-delete'));
    await page.click(subj('confirmModalConfirmButton'));
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
  })
  .step(`Search for 'stream' tag`, async ({ page, inputDelays }) => {
    await page.type(subj('tagsManagementSearchBar'), 'stream', {
      delay: inputDelays.TYPING,
    });
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
  })
  .step('Create a new tag', async ({ page, inputDelays, kibanaPage }) => {
    await kibanaPage.clearInput(subj('tagsManagementSearchBar'));
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
    await page.click(subj('createTagButton'));
    await page.type(subj('createModalField-name'), TAG_NAME, { delay: inputDelays.TYPING });
    await kibanaPage.clickAndWaitFor(subj('createModalConfirmButton'), 'detached');
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
    // search for newly created tag
    await page.type(subj('tagsManagementSearchBar'), TAG_NAME, {
      delay: inputDelays.TYPING,
    });
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
    await page.waitForSelector(subj('tagsTableRowName'), { state: 'visible' });
  })
  .step('Update tag', async ({ page, inputDelays, kibanaPage }) => {
    await page.click(subj('tagsTableAction-edit'));
    await page.type(subj('createModalField-description'), TAG_DESCRIPTION, {
      delay: inputDelays.TYPING,
    });
    await kibanaPage.clickAndWaitFor(subj('createModalConfirmButton'), 'detached');
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
  })
  .step('Delete tag', async ({ page }) => {
    const tagRow = page.locator(subj('tagsTableRowName'));
    await page.click(subj('euiCollapsedItemActionsButton'));
    await page.click(subj('tagsTableAction-delete'));
    await page.click(subj('confirmModalConfirmButton'));
    await page.waitForSelector(subj('tagsManagementTable table-is-ready'));
    await tagRow.waitFor({ state: 'detached' });
  });
