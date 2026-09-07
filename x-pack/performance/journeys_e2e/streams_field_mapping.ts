/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupFieldMappingAtScale } from '../synthtrace_data/streams_data';

const getNewFieldName = (): string => {
  const phase = (process.env.TEST_PERFORMANCE_PHASE ?? 'local')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_');

  return `attributes.perf_scale_new_field_${phase}`;
};

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
  beforeSteps: async ({ kibanaServer, log }) => {
    await setupFieldMappingAtScale(kibanaServer, log);
  },
})
  .step('Go to stream schema page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.otel.child1/management/schema'));
    await page.waitForSelector(subj('streamsAppContentAddFieldButton'), { timeout: 60000 });
  })
  .step('Open add field flyout', async ({ page }) => {
    await page.click(subj('streamsAppContentAddFieldButton'));
    await page.waitForSelector(subj('streamsAppSchemaEditorAddFieldFlyoutFieldName'), {
      timeout: 30000,
    });
  })
  .step('Configure new field mapping', async ({ page, inputDelays }) => {
    const comboBox = page.locator(subj('streamsAppSchemaEditorAddFieldFlyoutFieldName'));
    const comboInput = comboBox.locator('input[role="combobox"]');
    const fieldName = getNewFieldName();
    await comboInput.click();
    await comboInput.pressSequentially(fieldName, {
      delay: inputDelays.TYPING,
      timeout: 60000,
    });
    await page.keyboard.press('Enter');

    await page.click(subj('streamsAppFieldFormTypeSelect'));
    await page.click(subj('option-type-keyword'));
  })
  .step('Add field mapping', async ({ page }) => {
    await page.waitForSelector(`${subj('streamsAppSchemaEditorAddFieldButton')}:not([disabled])`, {
      timeout: 30000,
    });
    await page.click(subj('streamsAppSchemaEditorAddFieldButton'));
    await page.waitForSelector(subj('streamsAppSchemaEditorAddFieldFlyoutCloseButton'), {
      state: 'detached',
      timeout: 30000,
    });
  })
  .step('Review and submit field mapping', async ({ page }) => {
    await page.waitForSelector(subj('streamsAppSchemaEditorReviewStagedChangesButton'), {
      timeout: 60000,
    });
    await page.click(subj('streamsAppSchemaEditorReviewStagedChangesButton'));
    await page.waitForSelector(subj('streamsAppSchemaChangesReviewModalSubmitButton'), {
      timeout: 60000,
    });
    await page.click(subj('streamsAppSchemaChangesReviewModalSubmitButton'));
    await page.waitForSelector(subj('streamsAppSchemaChangesReviewModalSubmitButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
