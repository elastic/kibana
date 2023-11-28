/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { SynthtraceClient } from '../services/synthtrace';
import { generateData } from '../synthtrace_data/apm_data';

export const journey = new Journey({
  beforeSteps: async ({ kbnUrl, log, auth, es }) => {
    // Install APM Package
    const synthClient = new SynthtraceClient({
      kbnBaseUrl: kbnUrl.get(),
      logger: log,
      username: auth.getUsername(),
      password: auth.getPassword(),
      esClient: es,
    });

    await synthClient.installApmPackage();
    // Setup Synthtrace Client
    await synthClient.initialiseEsClient();
    // Generate data using Synthtrace
    const start = Date.now() - 1000 * 60 * 15;
    const end = Date.now() + 1000 * 60 * 15;
    await synthClient.index(
      generateData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  },
  ftrConfigPath: 'x-pack/performance/configs/apm_config.ts',
})
  .step('Navigate to Service Inventory Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`app/apm/services`));
    await page.waitForSelector(`[data-test-subj="serviceLink_nodejs"]`);
  })
  .step('Navigate to Service Overview Page', async ({ page }) => {
    await page.click(subj('serviceLink_nodejs'));
    await page.waitForSelector(subj('apmMainTemplateHeaderServiceName'));
  })
  .step('Navigate to Transactions tabs', async ({ page }) => {
    await page.click(subj('transactionsTab'));
    await page.waitForSelector(subj('apmTransactionDetailLinkLink'));
  })
  .step('Wait for Trace Waterfall on the page to load', async ({ page }) => {
    await page.click(subj('apmTransactionDetailLinkLink'));
    await page.waitForSelector(subj('apmWaterfallButton'));
  });
