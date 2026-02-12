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
  .step('Go to stream detail page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.child1'));
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  })
  .step('Navigate to Data Quality tab', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.child1/management/dataQuality'));
    await page.waitForSelector(subj('datasetQualityDetailsSummaryKpiCard-Degraded documents'), {
      timeout: 60000,
    });
  })
  .step('Verify data quality metrics render', async ({ page }) => {
    await page.waitForSelector(subj('datasetQualityDetailsSummaryKpiCard-Failed documents'));
  });
