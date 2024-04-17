/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

import dataView from '../kbn_archives/large_arrays_data_view.json';

export const journey = new Journey({
  kbnArchives: ['x-pack/performance/kbn_archives/large_arrays_data_view'],
  esArchives: ['x-pack/test/functional/es_archives/large_arrays'],
})
  .step('Go to AIOps Log Rate Analysis', async ({ page, kbnUrl, kibanaPage }) => {
    // Navigate to Log Rate Analysis with just a prepopulated time range.
    await page.goto(
      kbnUrl.get(
        `app/ml/aiops/log_rate_analysis?index=${dataView.id}&_g=%28refreshInterval%3A%28pause%3A%21t%2Cvalue%3A60000%29%2Ctime%3A%28from%3A%272019-07-01T15%3A35%3A38.700Z%27%2Cto%3A%272019-07-05T15%3A35%3A38.700Z%27%29%29&_a=%28logRateAnalysis%3A%28filters%3A%21%28%29%2CsearchQuery%3A%28match_all%3A%28%29%29%2CsearchQueryLanguage%3Akuery%2CsearchString%3A%27%27%29%29`
      )
    );

    // Wait for the AIOps Log Rate Analysis page wrapper to load
    await page.waitForSelector(subj('aiopsLogRateAnalysisPage'));
    await page.waitForSelector(subj('aiopsDocumentCountChart'));
    // Wait for the histogram chart to load
    await kibanaPage.waitForCharts({
      parentLocator: subj('aiopsDocumentCountChart'),
      count: 1,
    });
    await page.waitForSelector(subj('aiopsNoWindowParametersEmptyPrompt'));
  })
  .step('Run AIOps Log Rate Analysis', async ({ page }) => {
    // Select the chart and click in the area where the spike is located to trigger log rate analysis.
    const chart = await page.locator(subj('aiopsDocumentCountChart'));
    await chart.click({ position: { x: 710, y: 50 } });
    await page.waitForSelector(subj('aiopsAnalysisComplete'), { timeout: 120000 });
  });
