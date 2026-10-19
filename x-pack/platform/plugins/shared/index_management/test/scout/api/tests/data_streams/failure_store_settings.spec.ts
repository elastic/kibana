/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const DEFAULT_RETENTION_SETTING = 'data_streams.lifecycle.retention.failures_default';

// This suite mutates a cluster-global persistent setting, so it clears it around every test rather
// than only once.
const clearSettings = (esClient: EsClient) =>
  esClient.cluster.putSettings({ persistent: { [DEFAULT_RETENTION_SETTING]: null } });

apiTest.describe('Failure store settings API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await clearSettings(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await clearSettings(esClient);
  });

  apiTest(
    'falls back to the cluster default failed data retention when no override is set',
    async ({ apiClient, esClient }) => {
      const { defaults } = await esClient.cluster.getSettings({ include_defaults: true });
      const esDefaultRetention = defaults?.data_streams?.lifecycle?.retention?.failures_default;

      const response = await apiClient.get(`${API_BASE_PATH}/data_streams/failure_store_settings`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(response.body).sort()).toStrictEqual([
        'defaultRetentionPeriod',
        'enabled',
      ]);
      expect(response.body.defaultRetentionPeriod).toBe(esDefaultRetention);
    }
  );

  apiTest(
    'reflects the persistent cluster default failed data retention override',
    async ({ apiClient, esClient }) => {
      await esClient.cluster.putSettings({
        persistent: { [DEFAULT_RETENTION_SETTING]: '7d' },
      });

      const response = await apiClient.get(`${API_BASE_PATH}/data_streams/failure_store_settings`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.defaultRetentionPeriod).toBe('7d');
    }
  );
});
