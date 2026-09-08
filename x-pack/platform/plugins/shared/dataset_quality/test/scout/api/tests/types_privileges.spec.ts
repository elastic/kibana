/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import rison from '@kbn/rison';

import type { DatasetTypesPrivileges } from '../../../../common/api_types';
import type { DataStreamType } from '../../../../common/types/dataset_types';
import { apiTest, testData } from '../fixtures';
import { noAccessRole } from '../../common';

const SUITE_TAG = [...tags.stateful.classic, ...tags.serverless.observability.complete];

const typesPrivilegesUrl = (types: DataStreamType[]) =>
  `${testData.API.TYPES_PRIVILEGES}?${new URLSearchParams({
    types: rison.encodeArray(types),
  }).toString()}`;

type TypePrivileges = DatasetTypesPrivileges[string];

const NO_PRIVILEGES: TypePrivileges = {
  canRead: false,
  canMonitor: false,
  canReadFailureStore: false,
  canManageFailureStore: false,
};

const FULL_PRIVILEGES: TypePrivileges = {
  canRead: true,
  canMonitor: true,
  canReadFailureStore: true,
  canManageFailureStore: true,
};

apiTest.describe('Dataset quality - types privileges', { tag: SUITE_TAG }, () => {
  apiTest('returns no privileges with a single type', async ({ apiClient, samlAuth }) => {
    // The permission boundary is the subject of the test, so a custom role is required.
    const { cookieHeader } = await samlAuth.asInteractiveUser(noAccessRole);

    const response = await apiClient.get(typesPrivilegesUrl(['logs']), {
      headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.datasetTypesPrivileges['logs-*-*']).toStrictEqual(NO_PRIVILEGES);
  });

  apiTest('returns no privileges with multiple types', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(noAccessRole);

    const response = await apiClient.get(typesPrivilegesUrl(['logs', 'metrics']), {
      headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.datasetTypesPrivileges['logs-*-*']).toStrictEqual(NO_PRIVILEGES);
    expect(response.body.datasetTypesPrivileges['metrics-*-*']).toStrictEqual(NO_PRIVILEGES);
  });

  apiTest('returns full privileges with a single type', async ({ apiClient, samlAuth }) => {
    // `admin` is deliberate: the assertion is that every privilege resolves to true.
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get(typesPrivilegesUrl(['logs']), {
      headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.datasetTypesPrivileges['logs-*-*']).toStrictEqual(FULL_PRIVILEGES);
  });

  apiTest('returns full privileges with multiple types', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get(typesPrivilegesUrl(['logs', 'metrics', 'traces']), {
      headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.datasetTypesPrivileges['logs-*-*']).toStrictEqual(FULL_PRIVILEGES);
    expect(response.body.datasetTypesPrivileges['metrics-*-*']).toStrictEqual(FULL_PRIVILEGES);
    expect(response.body.datasetTypesPrivileges['traces-*-*']).toStrictEqual(FULL_PRIVILEGES);
  });

  apiTest('returns full privileges with all types', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get(
      typesPrivilegesUrl(['logs', 'metrics', 'traces', 'synthetics']),
      {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.datasetTypesPrivileges['logs-*-*']).toStrictEqual(FULL_PRIVILEGES);
    expect(response.body.datasetTypesPrivileges['metrics-*-*']).toStrictEqual(FULL_PRIVILEGES);
    expect(response.body.datasetTypesPrivileges['traces-*-*']).toStrictEqual(FULL_PRIVILEGES);
    expect(response.body.datasetTypesPrivileges['synthetics-*-*']).toStrictEqual(FULL_PRIVILEGES);
  });

  apiTest('returns the expected response structure', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get(typesPrivilegesUrl(['logs']), {
      headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.datasetTypesPrivileges).toBeDefined();

    const privilegeKeys = Object.keys(response.body.datasetTypesPrivileges['logs-*-*']);
    expect(privilegeKeys).toContain('canRead');
    expect(privilegeKeys).toContain('canMonitor');
    expect(privilegeKeys).toContain('canReadFailureStore');
  });
});
