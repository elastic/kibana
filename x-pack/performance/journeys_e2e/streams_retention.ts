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
    // Wait for the modal to appear
    await page.waitForSelector(subj('editLifecycleModalTitle'));
  })
  .step('Set custom retention', async ({ page }) => {
    // Toggle the inherit switch OFF to enable custom retention options
    const inheritSwitch = page.locator(subj('inheritDataRetentionSwitch'));
    const isChecked = await inheritSwitch.isChecked();
    if (isChecked) {
      await inheritSwitch.click();
    }

    // Click "Custom period" button in the button group
    await page.locator('[role="button"]').filter({ hasText: 'Custom period' }).click();

    // Wait for the days field and fill in the retention value
    await page.waitForSelector(subj('streamsAppDslModalDaysField'));
    const daysInput = page.locator(subj('streamsAppDslModalDaysField'));
    await daysInput.fill('');
    await daysInput.fill('30');
  })
  .step('Save retention settings', async ({ page }) => {
    await page.click(subj('streamsAppModalFooterButton'));
    // Wait for the modal to close
    await page.waitForSelector(subj('editLifecycleModalTitle'), {
      state: 'detached',
      timeout: 30000,
    });
  });
