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
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    const { databases } = await esClient.ingest.getGeoipDatabase();
    const databaseIds = databases.map(({ id }) => id);

    for (const databaseId of databaseIds) {
      try {
        await esClient.ingest.deleteGeoipDatabase({ id: databaseId });
      } catch (error) {
        log.debug(`GeoIP database cleanup failed for ${databaseId}: ${(error as Error).message}`);
      }
    }
  });

  apiTest(
    'creates a MaxMind GeoIP database when using a correct database name',
    async ({ apiClient }) => {
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
      expect(response.body).toStrictEqual({
        name: maxmindDatabaseName,
        id: normalizedMaxmindDatabaseName,
      });
    }
  );

  apiTest(
    'creates an IPinfo GeoIP database when using a correct database name',
    async ({ apiClient }) => {
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
      expect(response.body).toStrictEqual({
        name: ipinfoDatabaseName,
        id: normalizedIpinfoDatabaseName,
      });
    }
  );

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

  apiTest('returns existing databases', async ({ apiClient }) => {
    const response = await apiClient.get(testData.DATABASES_API_BASE_PATH, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual([
      {
        id: normalizedMaxmindDatabaseName,
        name: maxmindDatabaseName,
        type: 'maxmind',
      },
      {
        id: normalizedIpinfoDatabaseName,
        name: ipinfoDatabaseName,
        type: 'ipinfo',
      },
    ]);
  });

  apiTest('deletes a GeoIP database', async ({ apiClient }) => {
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
    expect(ipinfoResponse).toHaveStatusCode(200);
  });
});
