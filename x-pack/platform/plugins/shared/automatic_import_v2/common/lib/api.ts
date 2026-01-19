/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export const FLEET_PACKAGES_PATH = `/api/fleet/epm/packages`;

const fleetDefaultHeaders = {
  'Elastic-Api-Version': '2023-10-31',
};

export interface RequestDeps {
  http: HttpSetup;
  abortSignal: AbortSignal;
}

export interface EpmPackageResponse {
  items: [{ id: string; type: string }];
  _meta?: {
    install_source: string;
    name: string;
  };
}

export const getInstalledPackages = async ({
  http,
  abortSignal,
}: RequestDeps): Promise<EpmPackageResponse> =>
  http.get<EpmPackageResponse>(FLEET_PACKAGES_PATH, {
    headers: fleetDefaultHeaders,
    query: { prerelease: true },
    signal: abortSignal,
  });
