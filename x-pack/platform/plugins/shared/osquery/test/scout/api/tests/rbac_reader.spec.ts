/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Osquery RBAC - reader role',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    let readerCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      readerCredentials = await requestAuth.getApiKeyForViewer();
    });

    apiTest('returns 403 when creating a saved query', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: testData.getMinimalSavedQuery(),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('returns 403 when creating a live query', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: testData.getMinimalLiveQuery(),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('returns 403 when creating a pack', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: testData.getMinimalPack(),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
