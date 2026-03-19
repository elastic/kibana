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

apiTest.describe('Osquery saved queries - editor', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  const createdSavedObjectIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
  });

  apiTest.afterAll(async ({ apiClient }) => {
    for (const soId of createdSavedObjectIds) {
      await apiClient.delete(`${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${soId}`, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      });
    }
  });

  apiTest('creates, reads, updates, and deletes a saved query', async ({ apiClient }) => {
    const queryBody = testData.getMinimalSavedQuery();

    const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: queryBody,
      responseType: 'json',
    });
    expect(createResponse).toHaveStatusCode(200);
    const savedObjectId = createResponse.body.data.saved_object_id;
    expect(createResponse.body.data.id).toBe(queryBody.id);

    const readResponse = await apiClient.get(
      `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(readResponse).toHaveStatusCode(200);
    expect(readResponse.body.data.id).toBe(queryBody.id);

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
    expect(updateResponse.body.data.id).toBe(updatedId);

    const findResponse = await apiClient.get(
      `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?page=1&pageSize=20`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(findResponse).toHaveStatusCode(200);
    const found = findResponse.body.data.some((q: { id: string }) => q.id === updatedId);
    expect(found).toBe(true);

    const deleteResponse = await apiClient.delete(
      `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}/${savedObjectId}`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(deleteResponse).toHaveStatusCode(200);
  });

  apiTest('filters by search term and createdBy', async ({ apiClient }) => {
    const uniquePrefix = `findtest-${Date.now()}`;
    const savedObjectIds: string[] = [];
    let createdByUser: string | undefined;

    for (const suffix of ['alpha', 'beta', 'gamma']) {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: testData.getMinimalSavedQuery({ id: `${uniquePrefix}-${suffix}` }),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      savedObjectIds.push(createResponse.body.data.saved_object_id);
      createdByUser ??= createResponse.body.data.created_by;
    }

    createdSavedObjectIds.push(...savedObjectIds);

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

    const createdByResponse = await apiClient.get(
      `${testData.API_PATHS.OSQUERY_SAVED_QUERIES}?createdBy=${createdByUser}&pageSize=100`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(createdByResponse).toHaveStatusCode(200);
    expect(createdByResponse.body.total).toBeGreaterThan(0);
    const creators = createdByResponse.body.data.map(
      (q: { created_by: string }) => q.created_by
    );
    const uniqueCreators = [...new Set(creators)];
    expect(uniqueCreators).toEqual([createdByUser]);

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
});
