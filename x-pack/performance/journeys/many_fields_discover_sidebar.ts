/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { waitForChrome } from '../utils';

export const journey = new Journey({
  kbnArchives: ['test/functional/fixtures/kbn_archiver/many_fields_data_view'],
  esArchives: ['test/functional/fixtures/es_archiver/many_fields'],
})
  .step('Go to Discover Page and wait for the sidebar', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/discover`));
    await waitForChrome(page);
    await page.waitForSelector(subj('fieldListGroupedAvailableFields-count'));
  })
  .step('Add a field to the table', async ({ page, kbnUrl }) => {
    const fieldName = '_all.primaries.bulk.avg_size_in_bytes';
    await page.locator(subj(`field-${fieldName}`)).hover();
    await page.locator(subj(`fieldToggle-${fieldName}`)).click();
    await page.waitForSelector(subj('fieldListGroupedSelectedFields-count'));
  });
