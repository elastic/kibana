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

const FLEET_AVAILABLE_SUMMARY = 'Fleet is available';
// Fleet also sets `meta.error` while it is still retrying setup, so only this summary is terminal.
const FLEET_SETUP_FAILED_SUMMARY = 'Fleet setup failed';
const FLEET_SETUP_TIMEOUT_MS = 5 * 60 * 1000;
const FLEET_SETUP_POLL_INTERVAL_MS = 2000;

export const waitForFleetSetup = async (root: Root, timeoutMs = FLEET_SETUP_TIMEOUT_MS) => {
  const deadline = Date.now() + timeoutMs;
  let lastFleetStatus: unknown;

  const isFleetSetupRunning = async () => {
    const statusApi = getSupertestWithAdminUser(root, 'get', '/api/status');
    const resp = await statusApi.send();
    const fleetStatus = resp.body?.status?.plugins?.fleet;
    lastFleetStatus = fleetStatus;

    if (fleetStatus?.summary === FLEET_SETUP_FAILED_SUMMARY) {
      throw new FleetError(`Setup failed: ${JSON.stringify(fleetStatus)}`);
    }

    return fleetStatus?.summary !== FLEET_AVAILABLE_SUMMARY;
  };

  while (await isFleetSetupRunning()) {
    if (Date.now() >= deadline) {
      throw new FleetError(
        `Setup did not complete within ${timeoutMs}ms, last status: ${JSON.stringify(
          lastFleetStatus
        )}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, FLEET_SETUP_POLL_INTERVAL_MS));
  }
};

export function getSupertestWithAdminUser(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`);
  return getSupertest(root, method, path).set(
    'Authorization',
    `Basic ${testUserCredentials.toString('base64')}`
  );
}
