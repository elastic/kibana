/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  kbnArchives: ['test/functional/fixtures/kbn_archiver/many_fields_data_view'],
  esArchives: ['test/functional/fixtures/es_archiver/many_fields'],
})
  .step('Go to Transforms', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(kbnUrl.get(`app/management/data/transform`));
    await kibanaPage.waitForHeader();
    await page.waitForSelector(subj('transformCreateFirstButton'));
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'));
  })
  .step('Go to data view selection', async ({ page }) => {
    const createButtons = page.locator(subj('transformCreateFirstButton'));
    await createButtons.first().click();
    await page.waitForSelector(subj('savedObjectsFinderTable'));
  })
  .step('Go to Transform Wizard', async ({ page }) => {
    await page.click(subj('savedObjectTitleindices-stats*'));
    // Extended the timeout, this one tracks a known issue with slow data grid performance with many fields
    await page.waitForSelector(subj('transformIndexPreview loaded'), { timeout: 120000 });
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'), { timeout: 120000 });
  });
