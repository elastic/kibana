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

apiTest.describe('Ingest pipelines GeoIP databases API', { tag: tags.stateful.classic }, () => {
  const maxmindDatabaseName = 'GeoIP2-Anonymous-IP';
  const normalizedMaxmindDatabaseName = 'geoip2-anonymous-ip';
  const ipinfoDatabaseName = 'asn';
  const normalizedIpinfoDatabaseName = 'asn';
  const databaseIdsToCleanup = new Set<string>();
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    for (const databaseId of databaseIdsToCleanup) {
      try {
        await esClient.ingest.deleteGeoipDatabase({ id: databaseId });
      } catch (error) {
        log.debug(`GeoIP database cleanup failed for ${databaseId}: ${(error as Error).message}`);
      }
    }
  });

  apiTest('creates, lists, and deletes GeoIP databases', async ({ apiClient }) => {
    await apiTest.step('create a MaxMind database', async () => {
      const response = await apiClient.post(testData.DATABASES_API_BASE_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
        body: {
          databaseType: 'maxmind',
          databaseName: maxmindDatabaseName,
          maxmind: '123456',
        },
      });

      expect(response).toHaveStatusCode(200);
      databaseIdsToCleanup.add(normalizedMaxmindDatabaseName);
      expect(response.body).toStrictEqual({
        name: maxmindDatabaseName,
        id: normalizedMaxmindDatabaseName,
      });
    });

    await apiTest.step('create an IPinfo database', async () => {
      const response = await apiClient.post(testData.DATABASES_API_BASE_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
        body: {
          databaseType: 'ipinfo',
          databaseName: ipinfoDatabaseName,
        },
      });

      expect(response).toHaveStatusCode(200);
      databaseIdsToCleanup.add(normalizedIpinfoDatabaseName);
      expect(response.body).toStrictEqual({
        name: ipinfoDatabaseName,
        id: normalizedIpinfoDatabaseName,
      });
    });

    await apiTest.step('list existing databases', async () => {
      const response = await apiClient.get(testData.DATABASES_API_BASE_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
      });

      expect(response).toHaveStatusCode(200);
      const databases = response.body as Array<{ id: string; name: string; type: string }>;
      expect(databases.find(({ id }) => id === normalizedMaxmindDatabaseName)).toStrictEqual({
        id: normalizedMaxmindDatabaseName,
        name: maxmindDatabaseName,
        type: 'maxmind',
      });
      expect(databases.find(({ id }) => id === normalizedIpinfoDatabaseName)).toStrictEqual({
        id: normalizedIpinfoDatabaseName,
        name: ipinfoDatabaseName,
        type: 'ipinfo',
      });
    });

    await apiTest.step('delete created databases', async () => {
      const maxmindResponse = await apiClient.delete(
        `${testData.DATABASES_API_BASE_PATH}/${normalizedMaxmindDatabaseName}`,
        {
          headers: {
            ...testData.COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
        }
      );
      const ipinfoResponse = await apiClient.delete(
        `${testData.DATABASES_API_BASE_PATH}/${normalizedIpinfoDatabaseName}`,
        {
          headers: {
            ...testData.COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
        }
      );

      expect(maxmindResponse).toHaveStatusCode(200);
      databaseIdsToCleanup.delete(normalizedMaxmindDatabaseName);
      expect(ipinfoResponse).toHaveStatusCode(200);
      databaseIdsToCleanup.delete(normalizedIpinfoDatabaseName);
    });
  });

  apiTest(
    'returns an error when creating a GeoIP database with an incorrect name',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.DATABASES_API_BASE_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
        body: {
          databaseType: 'maxmind',
          databaseName: 'Test',
          maxmind: '123456',
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );
});
