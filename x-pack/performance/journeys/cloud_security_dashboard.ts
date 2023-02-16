/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { EsArchiver } from '@kbn/es-archiver';
import { Journey } from '@kbn/journeys';
// import { subj } from '@kbn/test-subj-selector';
// import { waitForVisualizations } from '../utils';

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/cloud_security_posture_config.ts',
  esArchives: ['x-pack/performance/es_archives/kspm_findings'],
  scalabilitySetup: {
    warmup: [
      {
        action: 'constantConcurrentUsers',
        userCount: 10,
        duration: '30s',
      },
      {
        action: 'rampConcurrentUsers',
        minUsersCount: 10,
        maxUsersCount: 50,
        duration: '2m',
      },
    ],
    test: [
      {
        action: 'constantConcurrentUsers',
        userCount: 50,
        duration: '1m',
      },
    ],
    maxDuration: '10m',
  },
})
  .step('wait for installation', async () => {
    await sleep(10000);
  })
  .step('Go to cloud security dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/security/cloud_security_posture/dashboard`));
    await page.waitForSelector(`[data-test-subj="csp:dashboard-sections-table-header-score"]`);
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
