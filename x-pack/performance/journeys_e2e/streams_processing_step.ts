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
  .step('Go to stream processing page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.child1/management/processing'));
    await page.waitForSelector(subj('streamsAppStreamDetailEnrichmentCreateProcessorButton'), {
      timeout: 60000,
    });
  })
  .step('Open add processor form', async ({ page }) => {
    await page.click(subj('streamsAppStreamDetailEnrichmentCreateProcessorButton'));
    await page.waitForSelector(subj('streamsAppAvailableProcessorsGrokLink'));
  })
  .step('Select grok processor', async ({ page }) => {
    await page.click(subj('streamsAppAvailableProcessorsGrokLink'));
    await page.waitForSelector(subj('streamsAppProcessorFieldSelectorComboFieldText'));
  })
  .step('Configure grok processor', async ({ page, inputDelays }) => {
    // Fill in the field selector (combo box)
    await page.click(subj('streamsAppProcessorFieldSelectorComboFieldText'));
    await page.type(subj('streamsAppProcessorFieldSelectorComboFieldText'), 'body.text', {
      delay: inputDelays.TYPING,
    });
    // Select the option from the dropdown
    const option = page.locator('[role="option"]').filter({ hasText: 'body.text' });
    await option.first().click();

    // Fill in the grok pattern
    await page.click(subj('streamsAppPatternExpression'));
    await page.type(subj('streamsAppPatternExpression'), '%{NUMBER:attributes.numberfield}', {
      delay: inputDelays.TYPING,
    });
  })
  .step('Save processor', async ({ page }) => {
    await page.click(subj('streamsAppProcessorConfigurationSaveProcessorButton'));
    // Wait for the save to complete — the form should dismiss
    await page.waitForSelector(subj('streamsAppProcessorConfigurationSaveProcessorButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
