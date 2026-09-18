/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, createDataStream, deleteDataStream, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

// A `logs-*-*` data stream takes its index mode from the cluster settings.
const DATA_STREAM_NAME = 'logs-index-management-api-ds';

// `logsdb.prior_logs_usage` only exists on stateful.
const CASES = [
  { enabled: true, priorLogsUsage: true, indexMode: 'logsdb' },
  { enabled: false, priorLogsUsage: true, indexMode: 'standard' },
  { enabled: null, priorLogsUsage: true, indexMode: 'standard' },
  { enabled: null, priorLogsUsage: false, indexMode: 'logsdb' },
];

// Cluster-global, so cleared around every test.
const clearSettings = (esClient: EsClient) =>
  esClient.cluster.putSettings({
    persistent: { cluster: { logsdb: { enabled: null } }, logsdb: { prior_logs_usage: null } },
  });

apiTest.describe('Data streams logsdb cluster settings API', { tag: tags.stateful.classic }, () => {
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

  for (const { enabled, priorLogsUsage, indexMode } of CASES) {
    apiTest(
      `returns ${indexMode} index mode if logsdb.enabled setting is ${enabled} and logs.prior_logs_usage is ${priorLogsUsage}`,
      async ({ apiClient, esClient }) => {
        await esClient.cluster.putSettings({
          persistent: {
            cluster: { logsdb: { enabled } },
            logsdb: { prior_logs_usage: priorLogsUsage },
          },
        });

        const response = await apiClient.get(`${API_BASE_PATH}/data_streams/${DATA_STREAM_NAME}`, {
          headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.indexMode).toBe(indexMode);
      }
    );
  }
});
