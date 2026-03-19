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

apiTest.describe('Osquery packs - editor', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  const createdPackIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
  });

  apiTest.afterAll(async ({ apiClient }) => {
    for (const packId of createdPackIds) {
      await apiClient.delete(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      });
    }
  });

  apiTest('creates and reads a pack', async ({ apiClient }) => {
    const packBody = testData.getMinimalPack();
    const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: packBody,
      responseType: 'json',
    });
    expect(createResponse).toHaveStatusCode(200);
    const packId = createResponse.body.data.saved_object_id;
    createdPackIds.push(packId);

    const readResponse = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(readResponse).toHaveStatusCode(200);
    expect(readResponse.body.data.name).toBe(packBody.name);
    expect(readResponse.body.data.queries.testQuery.query).toBe('select * from uptime;');
  });

  apiTest('creates a pack with multiple queries', async ({ apiClient }) => {
    const packBody = testData.getMinimalPack({
      queries: {
        memoryInfo: {
          query: 'SELECT * FROM memory_info;',
          interval: 3600,
          platform: 'linux',
        },
        systemInfo: {
          query: 'SELECT * FROM system_info;',
          interval: 600,
        },
        uptimeQuery: {
          query: 'select * from uptime;',
          interval: 900,
          platform: 'darwin',
        },
      },
    });

    const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: packBody,
      responseType: 'json',
    });
    expect(createResponse).toHaveStatusCode(200);
    createdPackIds.push(createResponse.body.data.saved_object_id);

    const { queries } = createResponse.body.data;
    expect(Object.keys(queries)).toHaveLength(3);
    expect(queries.memoryInfo.query).toBe('SELECT * FROM memory_info;');
    expect(queries.memoryInfo.platform).toBe('linux');
    expect(queries.systemInfo.interval).toBe(600);
  });

  apiTest('updates a pack', async ({ apiClient }) => {
    const packBody = testData.getMinimalPack();
    const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: packBody,
      responseType: 'json',
    });
    expect(createResponse).toHaveStatusCode(200);
    const packId = createResponse.body.data.saved_object_id;
    createdPackIds.push(packId);

    const updatedName = `${packBody.name}-updated`;
    const updateResponse = await apiClient.put(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        ...packBody,
        name: updatedName,
        enabled: false,
        queries: {
          ...packBody.queries,
          newQuery: { query: 'select * from processes;', interval: 1800 },
        },
      },
      responseType: 'json',
    });
    expect(updateResponse).toHaveStatusCode(200);

    const readResponse = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(readResponse).toHaveStatusCode(200);
    expect(readResponse.body.data.name).toBe(updatedName);
    expect(readResponse.body.data.enabled).toBe(false);
    expect(Object.keys(readResponse.body.data.queries)).toHaveLength(2);
  });

  apiTest('deletes a pack', async ({ apiClient }) => {
    const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: testData.getMinimalPack(),
      responseType: 'json',
    });
    expect(createResponse).toHaveStatusCode(200);
    const packId = createResponse.body.data.saved_object_id;

    const deleteResponse = await apiClient.delete(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(deleteResponse).toHaveStatusCode(200);

    const readResponse = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
      headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });

    // the API seems to throw a 500 error if the pack is not found
    expect(readResponse.statusCode).toBe(500);
  });

  apiTest('finds packs with search and enabled filters', async ({ apiClient }) => {
    const uniquePrefix = `findtest-${Date.now()}`;
    const packIds: string[] = [];
    let createdByUser: string | undefined;

    for (const [suffix, enabled] of [
      ['alpha', true],
      ['beta', false],
    ] as const) {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: testData.getMinimalPack({ name: `${uniquePrefix}-${suffix}`, enabled }),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      packIds.push(createResponse.body.data.saved_object_id);
      createdByUser ??= createResponse.body.data.created_by;
    }

    createdPackIds.push(...packIds);

    const searchResponse = await apiClient.get(
      `${testData.API_PATHS.OSQUERY_PACKS}?search=${uniquePrefix}`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(searchResponse).toHaveStatusCode(200);
    expect(searchResponse.body.total).toBe(2);

    const noMatchResponse = await apiClient.get(
      `${testData.API_PATHS.OSQUERY_PACKS}?search=zzzznonexistent999`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(noMatchResponse).toHaveStatusCode(200);
    expect(noMatchResponse.body.total).toBe(0);

    const createdByResponse = await apiClient.get(
      `${testData.API_PATHS.OSQUERY_PACKS}?search=${uniquePrefix}&createdBy=${createdByUser}`,
      {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );
    expect(createdByResponse).toHaveStatusCode(200);
    expect(createdByResponse.body.total).toBe(2);
  });
});
