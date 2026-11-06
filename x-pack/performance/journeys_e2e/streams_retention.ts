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
    await page.waitForSelector(subj('retention-metric'), {
      timeout: 60000,
    });
  })
  .step('Open edit retention flyout', async ({ page }) => {
    await page.click(subj('lifecyclePhase-delete-button'));
    await page.click(subj('lifecyclePhase-delete-editButton'));
    await page.waitForSelector(subj('streamsEditDataPhasesFlyout'), {
      timeout: 30000,
    });
  })
  .step('Set custom retention', async ({ page }) => {
    const deletePanel = page.locator(subj('streamsEditDataPhasesFlyoutPanel-delete'));
    const valueField = deletePanel.locator(subj('streamsEditDataPhasesFlyoutMoveAfterValue'));
    await valueField.fill('');
    await valueField.fill('60');
    await deletePanel.locator(subj('streamsEditDataPhasesFlyoutMoveAfterUnit')).selectOption('d');
    await deletePanel.locator(subj('streamsEditDataPhasesFlyoutMoveAfterUnit')).click();
  })
  .step('Save retention settings', async ({ page }) => {
    await page.click(subj('streamsEditDataPhasesFlyoutSaveButton'));
    await page.waitForSelector(subj('streamsEditDataPhasesFlyout'), {
      state: 'detached',
      timeout: 30000,
    });
  });
