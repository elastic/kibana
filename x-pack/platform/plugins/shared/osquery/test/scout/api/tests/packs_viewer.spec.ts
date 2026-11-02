/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Osquery packs - viewer',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
  () => {
    let viewerCredentials: RoleApiCredentials;
    let packId: string;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      viewerCredentials = await requestAuth.getApiKeyForViewer();

      const response = await apiServices.osquery.packs.create(testData.getMinimalPack());
      packId = (response.data as Record<string, Record<string, string>>).data.saved_object_id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (packId) {
        await apiServices.osquery.packs.delete(packId);
      }
    });

    apiTest('allows reading a pack', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
    });

    apiTest('denies pack creation', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
        body: testData.getMinimalPack(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest('denies pack update', async ({ apiClient }) => {
      const response = await apiClient.put(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
        body: { name: 'viewer-attempted-update', enabled: false },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest('denies pack deletion', async ({ apiClient }) => {
      const response = await apiClient.delete(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });
  }
);
