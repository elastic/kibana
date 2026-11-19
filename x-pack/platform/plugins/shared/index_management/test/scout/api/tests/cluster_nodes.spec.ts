/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, forDeployment, testData } from '../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

apiTest.describe('Cluster nodes API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  // Serverless does not expose node-level details, so the route is gone there.
  let expected: { status: number; isList: boolean };

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    expected = forDeployment(config, {
      stateful: { status: 200, isList: true },
      serverless: { status: 410, isList: false },
    });
  });

  apiTest('fetches the nodes plugins', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/nodes/plugins`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(expected.status);
    expect(Array.isArray(response.body)).toBe(expected.isList);
  });
});
