/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { INTERNAL_API_HEADERS } from './constants';

interface MlFleetPackage {
  name: string;
  version: string;
  moduleId: string;
}

/** Fleet packages required for ML data stream modules, with the ML module each one registers. */
export const ML_DATA_STREAM_FLEET_PACKAGES: readonly MlFleetPackage[] = [
  { name: 'apache', version: '3.0.2', moduleId: 'apache_data_stream' },
  { name: 'nginx', version: '3.2.2', moduleId: 'nginx_data_stream' },
];

/**
 * Sets up Fleet, installs packages, and waits until their ML modules are discoverable.
 * Mirrors FTR `ml.testResources.setupFleet` + `installFleetPackage` + `assertModuleExists`.
 */
export async function setupFleetPackages(
  apiServices: Pick<ApiServicesFixture, 'fleet'>,
  kbnClient: KbnClient,
  packages: readonly MlFleetPackage[] = ML_DATA_STREAM_FLEET_PACKAGES
): Promise<void> {
  await apiServices.fleet.internal.setup();

  for (const pkg of packages) {
    await apiServices.fleet.integration.installPackage(pkg.name, pkg.version, {
      force: true,
    });
  }

  // Package ML modules are stored as saved objects and may not be searchable as soon as install returns
  for (const { moduleId } of packages) {
    await expect
      .poll(
        async () => {
          const { status } = await kbnClient.request({
            method: 'GET',
            path: `/internal/ml/modules/get_module/${moduleId}`,
            headers: INTERNAL_API_HEADERS,
            ignoreErrors: [404],
          });
          return status;
        },
        {
          message: `ML module '${moduleId}' was not available after Fleet install`,
          timeout: 30000,
        }
      )
      .toBe(200);
  }
}

/**
 * Removes Fleet packages installed for ML data stream module tests.
 * Mirrors FTR `ml.testResources.removeFleetPackage`.
 */
export async function removeFleetPackages(
  apiServices: Pick<ApiServicesFixture, 'fleet'>,
  packages: readonly MlFleetPackage[] = ML_DATA_STREAM_FLEET_PACKAGES
): Promise<void> {
  for (const pkg of packages) {
    await apiServices.fleet.integration.delete(pkg.name);
  }
}
