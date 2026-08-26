/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, deleteTemplate, getTemplatePayload, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const TEMPLATE_NAME = 'index-management-api-logsdb-template';

// `logsdb.prior_logs_usage` only exists on stateful.
const CASES: Array<{ enabled: boolean | null; priorLogsUsage: boolean; indexMode?: string }> = [
  { enabled: true, priorLogsUsage: true, indexMode: 'logsdb' },
  { enabled: false, priorLogsUsage: true, indexMode: undefined },
  { enabled: null, priorLogsUsage: true, indexMode: undefined },
  { enabled: null, priorLogsUsage: false, indexMode: 'logsdb' },
];

// Cluster-global, so cleared around every test.
const clearSettings = (esClient: EsClient) =>
  esClient.cluster.putSettings({
    persistent: { cluster: { logsdb: { enabled: null } }, logsdb: { prior_logs_usage: null } },
  });

apiTest.describe(
  'Index templates logsdb cluster settings API',
  { tag: tags.stateful.classic },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
    });

    apiTest.beforeEach(async ({ apiClient, esClient }) => {
      await clearSettings(esClient);
      await deleteTemplate(esClient, TEMPLATE_NAME);

      const response = await apiClient.post(`${API_BASE_PATH}/index_templates`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify(
          getTemplatePayload({
            name: TEMPLATE_NAME,
            indexPatterns: ['logs-*-*'],
            serverless: false,
          })
        ),
      });
      expect(response).toHaveStatusCode(200);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await deleteTemplate(esClient, TEMPLATE_NAME);
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

          const response = await apiClient.get(
            `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}?legacy=false`,
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
