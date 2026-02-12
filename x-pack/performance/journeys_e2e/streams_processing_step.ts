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
    // Click the "Create Processor" button — Grok is the default processor type
    await page.click(subj('streamsAppStreamDetailEnrichmentCreateProcessorButton'));
    // Wait for the processor field selector to appear (part of the Grok form)
    await page.waitForSelector(subj('streamsAppProcessorFieldSelectorComboFieldText'), {
      timeout: 30000,
    });
  })
  .step('Configure grok processor', async ({ page, inputDelays }) => {
    // Fill in the field selector (EuiComboBox)
    const comboBox = page.locator(subj('streamsAppProcessorFieldSelectorComboFieldText'));
    const comboInput = comboBox.locator('input[role="combobox"]');
    await comboInput.click();
    await comboInput.pressSequentially('body.text', { delay: 50 });

    const option = page.locator(subj('autocomplete-suggestion-body.text'));
    try {
      await option.click({ timeout: 10000 });
    } catch {
      await page.keyboard.press('Enter');
    }

    // Fill in the grok pattern using the Expression component's textbox
    const patternExpression = page.locator(subj('streamsAppPatternExpression'));
    await patternExpression.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await patternExpression.locator('[role="textbox"]').fill('%{NUMBER:attributes.numberfield}');
  })
  .step('Save processor', async ({ page }) => {
    await page.click(subj('streamsAppProcessorConfigurationSaveProcessorButton'));
    // Wait for the save to complete — the form should dismiss
    await page.waitForSelector(subj('streamsAppProcessorConfigurationSaveProcessorButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
