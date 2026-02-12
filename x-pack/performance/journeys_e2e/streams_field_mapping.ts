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
  .step('Go to stream schema page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.child1/management/schema'));
    await page.waitForSelector(subj('streamsAppContentAddFieldButton'), { timeout: 60000 });
  })
  .step('Open add field flyout', async ({ page }) => {
    await page.click(subj('streamsAppContentAddFieldButton'));
    await page.waitForSelector(subj('streamsAppSchemaEditorAddFieldFlyoutFieldName'));
  })
  .step('Configure new field mapping', async ({ page, inputDelays }) => {
    // Type field name in the EuiComboBox and press Enter to confirm custom value
    const comboBox = page.locator(subj('streamsAppSchemaEditorAddFieldFlyoutFieldName'));
    await comboBox.locator('input[role="combobox"]').click();
    await comboBox
      .locator('input[role="combobox"]')
      .type('attributes.perf_test_field', { delay: inputDelays.TYPING });
    await page.keyboard.press('Enter');

    // Select field type via EuiSuperSelect — click the select, then click the option by test ID
    await page.click(subj('streamsAppFieldFormTypeSelect'));
    await page.click(subj('option-type-keyword'));
  })
  .step('Add field mapping', async ({ page }) => {
    // Click the "Add field" button in the add field flyout
    await page.click(subj('streamsAppSchemaEditorAddFieldButton'));
    // Wait for the flyout to close
    await page.waitForSelector(subj('streamsAppSchemaEditorAddFieldFlyoutCloseButton'), {
      state: 'detached',
      timeout: 30000,
    });
  })
  .step('Review and submit field mapping', async ({ page }) => {
    await page.waitForSelector(subj('streamsAppSchemaEditorReviewStagedChangesButton'));
    await page.click(subj('streamsAppSchemaEditorReviewStagedChangesButton'));
    await page.waitForSelector(subj('streamsAppSchemaChangesReviewModalSubmitButton'));
    await page.click(subj('streamsAppSchemaChangesReviewModalSubmitButton'));
    // Wait for the review modal to close after submission
    await page.waitForSelector(subj('streamsAppSchemaChangesReviewModalSubmitButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
