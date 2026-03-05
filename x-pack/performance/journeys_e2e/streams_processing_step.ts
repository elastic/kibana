/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupProcessingAtScale } from '../synthtrace_data/streams_data';

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
  beforeSteps: async ({ kibanaServer, log }) => {
    await setupProcessingAtScale(kibanaServer, log);
  },
})
  .step('Go to stream processing page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.otel.child1/management/processing'));
    await page.waitForSelector(subj('streamsAppStreamDetailEnrichmentCreateProcessorButton'), {
      timeout: 60000,
    });
  })
  .step('Open add processor form', async ({ page }) => {
    await page.click(subj('streamsAppStreamDetailEnrichmentCreateProcessorButton'));
    await page.waitForSelector(subj('streamsAppProcessorFieldSelectorComboFieldText'), {
      timeout: 30000,
    });
  })
  .step('Configure grok processor', async ({ page }) => {
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

    const patternTextbox = page
      .locator(subj('streamsAppPatternExpression'))
      .locator('[role="textbox"]');
    await patternTextbox.fill('%{NUMBER:attributes.numberfield}');
  })
  .step('Save processor', async ({ page }) => {
    await page.click(subj('streamsAppProcessorConfigurationSaveProcessorButton'));
    await page.waitForSelector(subj('streamsAppProcessorConfigurationSaveProcessorButton'), {
      state: 'detached',
      timeout: 30000,
    });
  });
