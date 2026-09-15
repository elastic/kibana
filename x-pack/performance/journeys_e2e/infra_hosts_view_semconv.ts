/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { generateHostsSemconvData } from '../synthtrace_data/hosts_semconv_data';

const TIMEOUT_MS = 60000;
const HOSTS_VIEW_SEMCONV_PATH = `app/metrics/hosts?_a=(dateRange:(from:now-15m,to:now),filters:!(),limit:500,panelFilters:!(),preferredSchema:semconv,query:(language:kuery,query:''))`;

export const journey = new Journey({
  synthtrace: {
    type: 'infra',
    generator: generateHostsSemconvData,
    options: {
      from: new Date(Date.now() - 1000 * 60 * 10),
      to: new Date(),
      count: 1000,
    },
  },
})
  .step(
    'Navigate to Hosts view and load 500 hosts (OTel semconv)',
    async ({ page, kbnUrl, kibanaPage }) => {
      await page.goto(kbnUrl.get(HOSTS_VIEW_SEMCONV_PATH), { timeout: TIMEOUT_MS });
      await kibanaPage.waitForHeader();
      await page.waitForSelector(subj('hostsView-table-loaded'), {
        state: 'visible',
        timeout: TIMEOUT_MS,
      });
      await kibanaPage.waitForCharts({
        parentLocator: subj('hostsViewKPIGrid'),
        count: 5,
        timeout: TIMEOUT_MS,
      });
    }
  )
  .step('Go to single host asset details view (OTel semconv)', async ({ page, kibanaPage }) => {
    const hostsTableLinks = await page.locator(subj('hostsViewTableEntryTitleLink'));
    await hostsTableLinks.first().click();
    await kibanaPage.waitForCharts({
      parentLocator: subj('infraAssetDetailsKPIGrid'),
      count: 4,
      timeout: TIMEOUT_MS,
    });
  });
