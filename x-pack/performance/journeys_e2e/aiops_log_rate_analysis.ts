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
  .step('Go to AIOps Log Rate Analysis', async ({ page, kbnUrl }) => {
    // Navigate to Log Rate Analysis with a prepopulated url state that runs
    // the analysis directly on page load without any necessary user interactions.
    await page.goto(
      kbnUrl.get(
        `app/ml/aiops/log_rate_analysis?index=${dataView.id}&_g=%28refreshInterval%3A%28pause%3A%21t%2Cvalue%3A60000%29%2Ctime%3A%28from%3A%272019-07-01T15%3A35%3A38.700Z%27%2Cto%3A%272019-07-05T15%3A35%3A38.700Z%27%29%29&_a=%28logRateAnalysis%3A%28filters%3A%21%28%29%2CsearchQuery%3A%28match_all%3A%28%29%29%2CsearchQueryLanguage%3Akuery%2CsearchString%3A%27%27%2Cwp%3A%28bMax%3A1562198400000%2CbMin%3A1562097600000%2CdMax%3A1562270400000%2CdMin%3A1562234400000%29%29%29`
      )
    );

    // Wait for the AIOps Log Rate Analysis page wrapper to load
    await page.waitForSelector(subj('aiopsLogRateAnalysisPage'));
  })
  .step('Run AIOps Log Rate Analysis', async ({ page, kbnUrl }) => {
    // Wait for the analysis to complete with extended timeout, this one tracks a known issue with slow frequent_item_sets performance.
    await page.waitForSelector(subj('aiopsAnalysisComplete'), { timeout: 120000 });
  });
