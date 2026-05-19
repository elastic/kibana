/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createDataStream,
  createHeaders,
  deleteDataStream,
  indexManagementApi,
  resetLogsdbClusterSettings,
  uniqueName,
} from '../fixtures';

apiTest.describe(
  'Index Management data stream index mode API',
  { tag: tags.stateful.classic },
  () => {
    apiTest.afterAll(async ({ esClient }) => {
      await resetLogsdbClusterSettings(esClient);
    });

    apiTest(
      'returns index mode based on index settings',
      async ({ apiClient, esClient, log, requestAuth }) => {
        const dataStreamName = uniqueName('im-logsdb-data-stream');
        await createDataStream({ esClient, name: dataStreamName, indexMode: 'logsdb' });

        try {
          const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
          const response = await indexManagementApi(
            apiClient,
            createHeaders(apiKeyHeader)
          ).dataStreams.getOne(dataStreamName);

          expect(response).toHaveStatusCode(200);
          expect(response.body.indexMode).toBe('logsdb');
        } finally {
          await deleteDataStream(esClient, dataStreamName, log);
        }
      }
    );

    for (const { enabled, priorLogsUsage, indexMode } of [
      { enabled: true, priorLogsUsage: true, indexMode: 'logsdb' },
      { enabled: false, priorLogsUsage: true, indexMode: 'standard' },
      { enabled: null, priorLogsUsage: true, indexMode: 'standard' },
      { enabled: null, priorLogsUsage: false, indexMode: 'logsdb' },
    ]) {
      apiTest(
        `returns ${indexMode} index mode when logsdb.enabled is ${enabled} and prior logs usage is ${priorLogsUsage}`,
        async ({ apiClient, esClient, log, requestAuth }) => {
          const dataStreamName = uniqueName('logs-im-test-ds');
          await createDataStream({ esClient, name: dataStreamName });

          try {
            await esClient.cluster.putSettings({
              persistent: {
                cluster: {
                  logsdb: {
                    enabled,
                  },
                },
                logsdb: {
                  prior_logs_usage: priorLogsUsage,
                },
              },
            });

            const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
            const response = await indexManagementApi(
              apiClient,
              createHeaders(apiKeyHeader)
            ).dataStreams.getOne(dataStreamName);

            expect(response).toHaveStatusCode(200);
            expect(response.body.indexMode).toBe(indexMode);
          } finally {
            await deleteDataStream(esClient, dataStreamName, log);
            await resetLogsdbClusterSettings(esClient);
          }
        }
      );
    }
  }
);
