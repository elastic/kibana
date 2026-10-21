/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adminTestUser } from '@kbn/test';
import { getSupertest, type createRoot, type HttpMethod } from '@kbn/core-test-helpers-kbn-server';

import { FleetError } from '../../errors';

type Root = ReturnType<typeof createRoot>;

export * from './docker_registry_helper';

const FLEET_SETUP_TIMEOUT_MS = 7 * 60 * 1000;

export const waitForFleetSetup = async (root: Root, timeoutMs = FLEET_SETUP_TIMEOUT_MS) => {
  let lastFleetStatus: unknown;

  // Fleet also publishes `meta.error` on retryable setup attempts, so only a terminal status settles this.
  const isFleetSetupRunning = async () => {
    const statusApi = getSupertestWithAdminUser(root, 'get', '/api/status');
    const resp = await statusApi.send();
    const fleetStatus = resp.body?.status?.plugins?.fleet;
    lastFleetStatus = fleetStatus;

    if (fleetStatus?.summary === 'Fleet setup failed') {
      throw new FleetError(`Setup failed: ${JSON.stringify(fleetStatus)}`);
    }

    return fleetStatus?.summary !== 'Fleet is available';
  };

  const deadline = Date.now() + timeoutMs;
  while (await isFleetSetupRunning()) {
    if (Date.now() >= deadline) {
      throw new FleetError(
        `Fleet setup did not complete within ${timeoutMs}ms, last status: ${JSON.stringify(
          lastFleetStatus
        )}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};

export function getSupertestWithAdminUser(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`);
  return getSupertest(root, method, path).set(
    'Authorization',
    `Basic ${testUserCredentials.toString('base64')}`
  );
}
