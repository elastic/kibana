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
  'Osquery saved queries - viewer',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
  () => {
    let viewerCredentials: RoleApiCredentials;
    let savedObjectId: string;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      viewerCredentials = await requestAuth.getApiKeyForViewer();

      const response = await apiServices.osquery.savedQueries.create(
        testData.getMinimalSavedQuery()
      );
      savedObjectId = (response.data as Record<string, Record<string, string>>).data
        .saved_object_id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (savedObjectId) {
        await apiServices.osquery.savedQueries.delete(savedObjectId);
      }
    });

    apiTest('allows reading a saved query', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
    });

    apiTest('denies saved query creation', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
        body: testData.getMinimalSavedQuery(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest('denies saved query update', async ({ apiClient }) => {
      const response = await apiClient.put(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
          body: { id: 'viewer-attempted-update', query: 'select 99;', interval: 3600 },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(403);
    });

    apiTest('denies saved query deletion', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(403);
    });
  }
);
