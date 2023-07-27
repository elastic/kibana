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
  kbnArchives: ['x-pack/performance/kbn_archives/lens_many_fields'],
  esArchives: ['test/functional/fixtures/es_archiver/stress_test'],
})
  .step('Go to Visualize Library', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/visualize`));
    await page.waitForSelector('#visualizeListingHeading');
  })
  .step('Open existing Lens', async ({ page, log }) => {
    await page.click(subj('visListingTitleLink-Lens-Stress-Test'));
    await waitForVisualizations(page, log, 1);
  });
