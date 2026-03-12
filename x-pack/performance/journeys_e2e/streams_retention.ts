/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupRetentionAtScale } from '../synthtrace_data/streams_data';

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
  beforeSteps: async ({ kibanaServer, log }) => {
    await setupRetentionAtScale(kibanaServer, log);
  },
})
  .step('Go to stream retention page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.otel.child1/management/retention'));
    await page.waitForSelector(subj('streamsAppRetentionMetadataEditDataRetentionButton'), {
      timeout: 60000,
    });
  })
  .step('Open edit retention modal', async ({ page }) => {
    await page.click(subj('streamsAppRetentionMetadataEditDataRetentionButton'));
    await page.waitForSelector(subj('editLifecycleModalTitle'));
  })
  .step('Set custom retention', async ({ page }) => {
    const inheritSwitch = page.locator(subj('inheritDataRetentionSwitch'));
    const isChecked = await inheritSwitch.isChecked();
    if (isChecked) {
      await inheritSwitch.click();
    }

    await page.click(subj('customRetentionButton'));

    await page.waitForSelector(subj('streamsAppDslModalDaysField'), { timeout: 30000 });
    const daysInput = page.locator(subj('streamsAppDslModalDaysField'));
    await daysInput.fill('30');
  })
  .step('Save retention settings', async ({ page }) => {
    await page.click(subj('streamsAppModalFooterButton'));
    await page.waitForSelector(subj('editLifecycleModalTitle'), {
      state: 'detached',
      timeout: 30000,
    });
  });
