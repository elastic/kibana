/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  kbnArchives: ['test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb'],
  esArchives: ['test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb'],
})
  .step('Go to Data Visualizer', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(kbnUrl.get(`app/ml/datavisualizer`));
    await kibanaPage.waitForHeader();
    await page.waitForSelector(subj('mlDataVisualizerCardIndexData'));
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'));
  })
  .step('Go to data view selection', async ({ page }) => {
    const createButtons = page.locator(subj('mlDataVisualizerSelectIndexButton'));
    await createButtons.first().click();
    await page.waitForSelector(subj('savedObjectsFinderTable'));
  })
  .step('Go to Index data visualizer', async ({ page, kibanaPage }) => {
    await page.click(subj('savedObjectTitlekibana_sample_data_logstsdb'));
    await page.click(subj('mlDatePickerButtonUseFullData'));
    await kibanaPage.waitForHeader();
    await page.waitForSelector(subj('dataVisualizerTable-loaded'), { timeout: 60000 });
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'), { timeout: 60000 });
  });
