/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  CreateAutoImportIntegrationResponse,
  GetAutoImportIntegrationResponse,
} from '../../../common/model/api/integrations/integration.gen';
import type { DataStream } from '../../../common/model/common_attributes.gen';

export const FLEET_PACKAGES_PATH = `/api/fleet/epm/packages`;
export const AUTOMATIC_IMPORT_INTEGRATIONS_PATH = `/api/automatic_import_v2/integrations`;

const fleetDefaultHeaders = {
  'Elastic-Api-Version': '2023-10-31',
};

export interface RequestDeps {
  http: HttpSetup;
  abortSignal?: AbortSignal;
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

export interface CreateUpdateIntegrationRequest {
  connectorId: string;
  integrationId: string;
  title: string;
  description: string;
  logo?: string;
  dataStreams?: DataStream[];
}

export const createIntegration = async ({
  http,
  abortSignal,
  ...body
}: RequestDeps & CreateUpdateIntegrationRequest): Promise<CreateAutoImportIntegrationResponse> =>
  http.put<CreateAutoImportIntegrationResponse>(AUTOMATIC_IMPORT_INTEGRATIONS_PATH, {
    version: '1',
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const getIntegrationById = async ({
  http,
  abortSignal,
  integrationId,
}: RequestDeps & { integrationId: string }): Promise<GetAutoImportIntegrationResponse> =>
  http.get<GetAutoImportIntegrationResponse>(
    `${AUTOMATIC_IMPORT_INTEGRATIONS_PATH}/${encodeURIComponent(integrationId)}`,
    {
      version: '1',
      signal: abortSignal,
    }
  );
