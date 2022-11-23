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
  // FAILING: https://github.com/elastic/kibana/issues/130287
  skipped: true,
  kbnArchives: ['test/functional/fixtures/kbn_archiver/many_fields_data_view'],
  esArchives: ['test/functional/fixtures/es_archiver/many_fields'],
})
  .step('Go to Discover Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/discover`));
    await waitForChrome(page);
    await page.waitForSelector(subj('discoverDocTable'));
  })
  .step('Expand the first document', async ({ page }) => {
    const expandButtons = page.locator(subj('docTableExpandToggleColumn'));
    await expandButtons.first().click();
    await page.locator('text="Expanded document"');
  });
