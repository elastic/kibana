/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupWiredStreams } from '../synthtrace_data/streams_data';

export const journey = new Journey({
  beforeSteps: async ({ kibanaServer, log }) => {
    await setupWiredStreams(kibanaServer, log);
  },
})
  .step('Go to stream retention page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.child1/management/retention'));
    await page.waitForSelector(subj('streamsAppRetentionMetadataEditDataRetentionButton'), {
      timeout: 60000,
    });
  })
  .step('Open edit retention modal', async ({ page }) => {
    await page.click(subj('streamsAppRetentionMetadataEditDataRetentionButton'));
    await page.waitForSelector(subj('dataRetentionButtonGroup'));
  })
  .step('Set custom retention', async ({ page, inputDelays }) => {
    await page.click(subj('customRetentionButton'));
    await page.waitForSelector(subj('streamsAppDslModalDaysField'));

    // Clear any existing value and type the new retention period
    const daysInput = page.locator(subj('streamsAppDslModalDaysField'));
    await daysInput.fill('');
    await daysInput.type('30', { delay: inputDelays.TYPING });
  })
  .step('Save retention settings', async ({ page }) => {
    await page.click(subj('streamsAppModalFooterButton'));
    // Wait for the modal to close
    await page.waitForSelector(subj('streamsAppModalFooterButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
