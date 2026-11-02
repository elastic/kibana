/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import {
  setupMetricsExperienceData,
  METRICS_EXPERIENCE_CONFIG,
} from '../utils/metrics_experience_setup';

export const journey = new Journey({
  beforeSteps: async ({ es, log }) => {
    await setupMetricsExperienceData(es, log);
  },
})
  .step('Navigate to Discover and submit TS query', async ({ page, kbnUrl, kibanaPage }) => {
    const { indexName, discoverTimeRange } = METRICS_EXPERIENCE_CONFIG;
    const { from, to } = discoverTimeRange;
    const esqlEncoded = encodeURIComponent(`TS ${indexName}`);

    await page.goto(
      kbnUrl.get(
        `/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:'${from}',to:'${to}'))&_a=(columns:!(),dataSource:(type:esql),filters:!(),interval:auto,query:(esql:'${esqlEncoded}'),sort:!())`
      )
    );
    await kibanaPage.waitForHeader();
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'));
  })
  .step('Wait for the metrics grid to render', async ({ page }) => {
    await page.waitForSelector(subj('metricsExperienceRendered'), { timeout: 60000 });
  });
