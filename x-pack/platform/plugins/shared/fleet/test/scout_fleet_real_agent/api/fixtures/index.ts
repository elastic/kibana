/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';

import { REAL_FLEET_SETUP_TIMEOUT_MS, startRealFleet } from './real_fleet';
import type { RealFleet } from './real_fleet';

export type { RealFleet, EnrolledAgent } from './real_fleet';

export const apiTest = baseApiTest.extend<
  ScoutTestFixtures,
  ScoutWorkerFixtures & { realFleet: RealFleet }
>({
  realFleet: [
    async ({ kbnClient, log }, use) => {
      const { realFleet, stop } = await startRealFleet(kbnClient as any, log);
      try {
        await use(realFleet);
      } finally {
        await stop().catch((error) => log.warning(`[fleet_real_agent] cleanup failed: ${error}`));
      }
    },
    { scope: 'worker', timeout: REAL_FLEET_SETUP_TIMEOUT_MS },
  ],
});
