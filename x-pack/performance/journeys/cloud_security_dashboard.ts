/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/cloud_security_posture_config.ts',
  // esArchives: ['x-pack/performance/es_archives/kspm_findings'],
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
  .step('wait for installation and then post data', async ({ esArchiver }) => {
    await sleep(3000);
    await esArchiver.load('x-pack/performance/es_archives/kspm_findings');
    // Since the status API call calculates in APM output, I use here sleep

    // retry.try(async () => {
    //   const response = await kibanaServer.request({
    //     path: '/internal/cloud_security_posture/status?check=init',
    //     method: 'GET',
    //   });

    //   expect(response.status).to.eql(200);
    //   expect(response.data).to.eql({ isPluginInitialized: true });
    //   log.debug('CSP plugin is initialized');
    // });
  })
  // .step('Load data', async ({ es, esArchiver }) => {

  //   await esArchiver.load('x-pack/performance/es_archives/kspm_findings');

  //   // await sleep(3000);
  // })

  .step('Go to cloud security dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/security/cloud_security_posture/dashboard`));
    await page.waitForSelector(`[data-test-subj="csp:dashboard-sections-table-header-score"]`);
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
