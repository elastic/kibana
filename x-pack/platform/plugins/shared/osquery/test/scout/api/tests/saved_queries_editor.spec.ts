/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

// TODO: run tests on Elastic Cloud once bug fix #258883 is released
apiTest.describe(
  'Osquery saved queries - editor',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    let editorCredentials: RoleApiCredentials;
    const createdSavedObjectIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const soId of createdSavedObjectIds) {
        await apiServices.osquery.savedQueries.delete(soId);
      }
    });

    apiTest('creates and reads a saved query', async ({ apiClient }) => {
      const queryBody = testData.getMinimalSavedQuery();

      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: queryBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.data).toBeDefined();
      const savedObjectId = createResponse.body.data.saved_object_id;
      createdSavedObjectIds.push(savedObjectId);
      expect(createResponse.body.data.id).toBe(queryBody.id);

      const readResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(readResponse).toHaveStatusCode(200);
      expect(readResponse.body.data).toBeDefined();
      expect(readResponse.body.data.id).toBe(queryBody.id);
      expect(readResponse.body.data.query).toBe(queryBody.query);
    });

    apiTest('updates a saved query', async ({ apiClient }) => {
      const queryBody = testData.getMinimalSavedQuery();
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: queryBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.data).toBeDefined();
      const savedObjectId = createResponse.body.data.saved_object_id;
      createdSavedObjectIds.push(savedObjectId);

      const updatedId = `${queryBody.id}-updated`;
      const updateResponse = await apiClient.put(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          body: { id: updatedId, query: 'select 2;', interval: 3600 },
          responseType: 'json',
        }
      );
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.data).toBeDefined();
      expect(updateResponse.body.data.id).toBe(updatedId);

      const readResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(readResponse).toHaveStatusCode(200);
      expect(readResponse.body.data).toBeDefined();
      expect(readResponse.body.data.id).toBe(updatedId);
      expect(readResponse.body.data.query).toBe('select 2;');
    });

    apiTest('deletes a saved query', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: testData.getMinimalSavedQuery(),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.data).toBeDefined();
      const savedObjectId = createResponse.body.data.saved_object_id;

      const deleteResponse = await apiClient.delete(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(deleteResponse).toHaveStatusCode(200);

      const readResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );

      expect(readResponse).toHaveStatusCode(404);
    });

    apiTest('returns 404 when reading a non-existent saved query', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/non-existent-id`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 404 when updating a non-existent saved query', async ({ apiClient }) => {
      const response = await apiClient.put(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/non-existent-id`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          body: { id: 'updated-name', query: 'select 2;', interval: 3600 },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 404 when deleting a non-existent saved query', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/non-existent-id`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('filters by search term and createdBy', async ({ apiClient }) => {
      const uniquePrefix = `findtest-${Date.now()}`;
      let createdByUser: string | undefined;

      for (const suffix of ['alpha', 'beta', 'gamma']) {
        const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          body: testData.getMinimalSavedQuery({ id: `${uniquePrefix}-${suffix}` }),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body.data).toBeDefined();
        createdSavedObjectIds.push(createResponse.body.data.saved_object_id);
        createdByUser ??= createResponse.body.data.created_by;
      }

      const searchResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?search=${uniquePrefix}-alpha`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(searchResponse).toHaveStatusCode(200);
      expect(searchResponse.body.total).toBeGreaterThan(0);
      const found = searchResponse.body.data.some(
        (q: { id: string }) => q.id === `${uniquePrefix}-alpha`
      );
      expect(found).toBe(true);

      const noMatchResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?search=zzzznonexistent999`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(noMatchResponse).toHaveStatusCode(200);
      expect(noMatchResponse.body.total).toBe(0);

      expect(createdByUser).toBeDefined();

      const createdByResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?createdBy=${encodeURIComponent(
          createdByUser!
        )}&pageSize=100`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(createdByResponse).toHaveStatusCode(200);
      expect(createdByResponse.body.total).toBeGreaterThan(0);
      const creators = createdByResponse.body.data.map((q: { created_by: string }) => q.created_by);
      const uniqueCreators = [...new Set(creators)];
      expect(uniqueCreators).toStrictEqual([createdByUser]);

      const noUserResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?createdBy=nonexistentuser`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(noUserResponse).toHaveStatusCode(200);
      expect(noUserResponse.body.total).toBe(0);
    });
  }
);
