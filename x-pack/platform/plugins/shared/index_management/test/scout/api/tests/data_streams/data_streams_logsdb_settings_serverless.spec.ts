/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, createDataStream, deleteDataStream, testData } from '../../fixtures';
import { SERVERLESS_LOGS_CAPABLE } from '../../tags';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const DATA_STREAM_NAME = 'logs-index-management-api-ds';

// `cluster.logsdb.enabled` defaults to true here, so unset resolves to logsdb — the opposite of stateful.
const CASES = [
  { enabled: true, indexMode: 'logsdb' },
  { enabled: false, indexMode: 'standard' },
  { enabled: null, indexMode: 'logsdb' },
];

const clearSettings = (esClient: EsClient) =>
  esClient.cluster.putSettings({ persistent: { cluster: { logsdb: { enabled: null } } } });

apiTest.describe(
  'Data streams logsdb cluster settings API - serverless',
  { tag: SERVERLESS_LOGS_CAPABLE },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await clearSettings(esClient);
      await deleteDataStream(esClient, DATA_STREAM_NAME);
      await createDataStream(esClient, DATA_STREAM_NAME);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await deleteDataStream(esClient, DATA_STREAM_NAME);
      await clearSettings(esClient);
    });

    for (const { enabled, indexMode } of CASES) {
      apiTest(
        `returns ${indexMode} index mode if logsdb.enabled setting is ${enabled}`,
        async ({ apiClient, esClient }) => {
          await esClient.cluster.putSettings({
            persistent: { cluster: { logsdb: { enabled } } },
          });

          const response = await apiClient.get(
            `${API_BASE_PATH}/data_streams/${DATA_STREAM_NAME}`,
            {
              headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
              responseType: 'json',
            }
          );

          expect(response).toHaveStatusCode(200);
          expect(response.body.indexMode).toBe(indexMode);
        }
      );
    }
  }
);
