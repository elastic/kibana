/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupDataQualityAtScale } from '../synthtrace_data/streams_data';

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
  beforeSteps: async ({ kibanaServer, es, log }) => {
    await setupDataQualityAtScale(kibanaServer, es, log);
  },
})
  .step('Go to stream detail page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.otel.child1'));
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  })
  .step('Navigate to Data Quality tab', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.otel.child1/management/dataQuality'));
    await page.waitForSelector(subj('datasetQualityDetailsSummaryKpiCard-Degraded documents'), {
      timeout: 60000,
    });
  })
  .step('Verify data quality metrics render', async ({ page }) => {
    await page.waitForSelector(subj('datasetQualityDetailsSummaryKpiCard-Failed documents'));
  });
