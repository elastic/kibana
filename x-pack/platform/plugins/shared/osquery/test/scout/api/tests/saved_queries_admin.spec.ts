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

// TODO: run on ECH once #258866 is released
apiTest.describe(
  'Osquery saved queries - admin',
  { tag: ['@local-stateful-classic', ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const createdSavedObjectIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const soId of createdSavedObjectIds) {
        await apiServices.osquery.savedQueries.delete(soId);
      }
    });

    apiTest('includes profile_uid fields on create response', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: testData.getMinimalSavedQuery(),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.data).toBeDefined();
      createdSavedObjectIds.push(createResponse.body.data.saved_object_id);

      expect('created_by_profile_uid' in createResponse.body.data).toBe(true);
      expect('updated_by_profile_uid' in createResponse.body.data).toBe(true);
    });

    apiTest('includes profile_uid fields on read and find responses', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: testData.getMinimalSavedQuery(),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.data).toBeDefined();
      const savedObjectId = createResponse.body.data.saved_object_id;
      const queryId = createResponse.body.data.id;
      createdSavedObjectIds.push(savedObjectId);

      const readResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(readResponse).toHaveStatusCode(200);
      expect(readResponse.body.data).toBeDefined();
      expect('created_by_profile_uid' in readResponse.body.data).toBe(true);
      expect('updated_by_profile_uid' in readResponse.body.data).toBe(true);

      const findResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?page=1&pageSize=100`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(findResponse).toHaveStatusCode(200);
      const match = findResponse.body.data.find((q: { id: string }) => q.id === queryId);
      expect(match).toBeDefined();
      expect('created_by_profile_uid' in match).toBe(true);
      expect('updated_by_profile_uid' in match).toBe(true);
    });
  }
);
