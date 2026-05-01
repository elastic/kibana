/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { API_HEADERS, RULE_API_PATH } from '../fixtures';

apiTest.describe('Search rules by name and description', { tag: tags.stateful.classic }, () => {
  const ruleIds: string[] = [];
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['alerting_rule'] });
    ruleIds.length = 0;
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['alerting_rule'] });
  });

  apiTest('should find rules by name prefix', async ({ apiClient }) => {
    for (const name of ['HighCpuAlert', 'DiskUsageAlert']) {
      const res = await apiClient.post(RULE_API_PATH, {
        headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        },
        responseType: 'json',
      });
      expect(res.statusCode).toBe(200);
      ruleIds.push(res.body.id);
    }

    const response = await apiClient.get(`${RULE_API_PATH}?search=HighCpu&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('HighCpuAlert');
  });

  apiTest('should find rules by description prefix', async ({ apiClient }) => {
    const rules = [
      { name: 'rule-with-desc', description: 'Monitors memory pressure on production hosts' },
      { name: 'rule-no-match', description: 'Tracks network latency' },
    ];

    for (const { name, description } of rules) {
      const res = await apiClient.post(RULE_API_PATH, {
        headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name, description },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        },
        responseType: 'json',
      });
      expect(res.statusCode).toBe(200);
      ruleIds.push(res.body.id);
    }

    const response = await apiClient.get(`${RULE_API_PATH}?search=memory&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('rule-with-desc');
  });

  apiTest('should AND multiple search terms together', async ({ apiClient }) => {
    const rules = [
      { name: 'prod-cpu-alert', description: 'Monitors production CPU usage' },
      { name: 'dev-cpu-alert', description: 'Monitors development CPU usage' },
    ];

    for (const { name, description } of rules) {
      const res = await apiClient.post(RULE_API_PATH, {
        headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name, description },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        },
        responseType: 'json',
      });
      expect(res.statusCode).toBe(200);
      ruleIds.push(res.body.id);
    }

    const response = await apiClient.get(
      `${RULE_API_PATH}?search=${encodeURIComponent('cpu production')}&perPage=100`,
      {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('prod-cpu-alert');
  });

  apiTest('should return empty results when no fields match', async ({ apiClient }) => {
    const res = await apiClient.post(RULE_API_PATH, {
      headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
      body: {
        kind: 'alert',
        metadata: { name: 'some-rule' },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
      },
      responseType: 'json',
    });
    expect(res.statusCode).toBe(200);
    ruleIds.push(res.body.id);

    const response = await apiClient.get(`${RULE_API_PATH}?search=nonexistent&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(0);
    expect(response.body.total).toBe(0);
  });
});
