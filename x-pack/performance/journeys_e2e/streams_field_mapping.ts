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
    // Type field name in the combo box
    await page.click(subj('streamsAppSchemaEditorAddFieldFlyoutFieldName'));
    await page.type(
      subj('streamsAppSchemaEditorAddFieldFlyoutFieldName'),
      'attributes.perf_test_field',
      { delay: inputDelays.TYPING }
    );

    // Select field type
    await page.click(subj('streamsAppFieldFormTypeSelect'));
    const keywordOption = page.locator('[role="option"]').filter({ hasText: 'Keyword' });
    await keywordOption.first().click();
  })
  .step('Stage field mapping', async ({ page }) => {
    await page.click(subj('streamsAppSchemaEditorFieldStageButton'));
    await page.waitForSelector(subj('streamsAppSchemaEditorReviewStagedChangesButton'));
  })
  .step('Review and submit field mapping', async ({ page }) => {
    await page.click(subj('streamsAppSchemaEditorReviewStagedChangesButton'));
    await page.waitForSelector(subj('streamsAppSchemaChangesReviewModalSubmitButton'));
    await page.click(subj('streamsAppSchemaChangesReviewModalSubmitButton'));
    // Wait for the review modal to close after submission
    await page.waitForSelector(subj('streamsAppSchemaChangesReviewModalSubmitButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
