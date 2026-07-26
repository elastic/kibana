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
  'Osquery packs - editor',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    let editorCredentials: RoleApiCredentials;
    const createdPackIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const packId of createdPackIds) {
        await apiServices.osquery.packs.delete(packId);
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
      expect(createResponse.body.data).toBeDefined();
      const packId = createResponse.body.data.saved_object_id;
      createdPackIds.push(packId);

      const readResponse = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(readResponse).toHaveStatusCode(200);
      expect(readResponse.body.data).toBeDefined();
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
      expect(createResponse.body.data).toBeDefined();
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
      expect(createResponse.body.data).toBeDefined();
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
      expect(readResponse.body.data).toBeDefined();
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
      expect(createResponse.body.data).toBeDefined();
      const packId = createResponse.body.data.saved_object_id;

      const deleteResponse = await apiClient.delete(
        `${testData.API_PATHS.OSQUERY_PACKS}/${packId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(deleteResponse).toHaveStatusCode(200);

      const readResponse = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(readResponse).toHaveStatusCode(404);
    });

    apiTest('finds packs with search, enabled, and createdBy filters', async ({ apiClient }) => {
      const uniquePrefix = `findtest-${Date.now()}`;
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
        expect(createResponse.body.data).toBeDefined();
        createdPackIds.push(createResponse.body.data.saved_object_id);
        createdByUser ??= createResponse.body.data.created_by;
      }

      expect(createdByUser).toBeDefined();

      await apiTest.step('filters by search term', async () => {
        const searchResponse = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}?search=${encodeURIComponent(uniquePrefix)}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(searchResponse).toHaveStatusCode(200);
        expect(searchResponse.body.total).toBe(2);
      });

      await apiTest.step('returns empty results for non-matching search', async () => {
        const noMatchResponse = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}?search=zzzznonexistent999`,
          {
            headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(noMatchResponse).toHaveStatusCode(200);
        expect(noMatchResponse.body.total).toBe(0);
      });

      await apiTest.step('filters by enabled status', async () => {
        const enabledResponse = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}?search=${encodeURIComponent(
            uniquePrefix
          )}&enabled=true`,
          {
            headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(enabledResponse).toHaveStatusCode(200);
        expect(enabledResponse.body.total).toBe(1);
        expect(enabledResponse.body.data[0].name).toContain('alpha');

        const disabledResponse = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}?search=${encodeURIComponent(
            uniquePrefix
          )}&enabled=false`,
          {
            headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(disabledResponse).toHaveStatusCode(200);
        expect(disabledResponse.body.total).toBe(1);
        expect(disabledResponse.body.data[0].name).toContain('beta');
      });

      await apiTest.step('filters by createdBy', async () => {
        const createdByResponse = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}?search=${encodeURIComponent(
            uniquePrefix
          )}&createdBy=${encodeURIComponent(createdByUser!)}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(createdByResponse).toHaveStatusCode(200);
        expect(createdByResponse.body.total).toBe(2);
      });
    });
  }
);
