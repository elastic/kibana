/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, deleteTemplate, getTemplatePayload, testData } from '../../fixtures';
import { SERVERLESS_LOGS_CAPABLE } from '../../tags';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const TEMPLATE_NAME = 'index-management-api-logsdb-template-serverless';

// `cluster.logsdb.enabled` defaults to true here, so unset resolves to logsdb (opposite of stateful,
// where `prior_logs_usage` also applies — see index_templates_logsdb_settings.spec.ts).
const CASES: Array<{ enabled: boolean | null; indexMode?: string }> = [
  { enabled: true, indexMode: 'logsdb' },
  { enabled: false, indexMode: undefined },
  { enabled: null, indexMode: 'logsdb' },
];

// Cluster-global, so cleared around every test.
const clearSettings = (esClient: EsClient) =>
  esClient.cluster.putSettings({ persistent: { cluster: { logsdb: { enabled: null } } } });

apiTest.describe(
  'Index templates logsdb cluster settings API - serverless',
  { tag: SERVERLESS_LOGS_CAPABLE },
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
            serverless: true,
          })
        ),
      });
      expect(response).toHaveStatusCode(200);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await deleteTemplate(esClient, TEMPLATE_NAME);
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
            `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`,
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
