/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import expect from '@kbn/expect';

export const journey = new Journey({
  beforeSteps: async ({ kibanaServer, retry }) => {
    await retry.try(async () => {
      const response = await kibanaServer.request({
        path: '/internal/cloud_security_posture/status?check=init',
        method: 'GET',
      });
      expect(response.status).to.eql(200);
      expect(response.data).to.eql({ isPluginInitialized: true });
    });
  },
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
        duration: '3m',
      },
    ],
    maxDuration: '10m',
  },
}).step('Go to cloud security dashboards Page', async ({ page, kbnUrl }) => {
  await page.goto(kbnUrl.get(`/app/security/cloud_security_posture/dashboard`));
  await page.waitForSelector(`[data-test-subj="csp:dashboard-sections-table-header-score"]`);
});
