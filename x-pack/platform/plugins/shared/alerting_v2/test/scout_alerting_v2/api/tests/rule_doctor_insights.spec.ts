/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  API_HEADERS,
  INSIGHTS_API_PATH,
  RULE_DOCTOR_INSIGHTS_INDEX,
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
} from '../fixtures';

const createInsight = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': new Date().toISOString(),
  insight_id: `insight-${Math.random().toString(36).slice(2, 10)}`,
  execution_id: 'exec-1',
  status: 'open',
  type: 'coverage_gap',
  action: 'create_rule',
  impact: 'medium',
  confidence: 'high',
  title: 'Test insight',
  summary: 'A test insight for Scout API tests',
  rule_ids: [],
  data: {},
  current: null,
  proposed: null,
  space_id: 'default',
  ...overrides,
});

apiTest.describe('Rule Doctor insights API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();

    await kbnClient.uiSettings.update({
      [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
    });

    await esClient.indices.delete({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      ignore_unavailable: true,
    });

    await esClient.indices.create({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': { type: 'date' },
          insight_id: { type: 'keyword' },
          execution_id: { type: 'keyword' },
          status: { type: 'keyword' },
          type: { type: 'keyword' },
          action: { type: 'keyword' },
          impact: { type: 'keyword' },
          confidence: { type: 'keyword' },
          title: { type: 'text' },
          summary: { type: 'text' },
          rule_ids: { type: 'keyword' },
          data: { type: 'flattened' },
          space_id: { type: 'keyword' },
        },
      },
    });

    const insights = [
      createInsight({ insight_id: 'scout-insight-1', status: 'open', type: 'coverage_gap' }),
      createInsight({ insight_id: 'scout-insight-2', status: 'open', type: 'deduplication' }),
      createInsight({ insight_id: 'scout-insight-3', status: 'dismissed', type: 'coverage_gap' }),
    ];

    const operations = insights.flatMap((insight) => [
      { index: { _index: RULE_DOCTOR_INSIGHTS_INDEX, _id: insight.insight_id } },
      insight,
    ]);

    await esClient.bulk({ operations, refresh: 'wait_for' });
  });

  apiTest.afterAll(async ({ esClient, kbnClient }) => {
    await esClient.indices.delete({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      ignore_unavailable: true,
    });

    await kbnClient.uiSettings.update({
      [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
    });
  });

  apiTest('should list insights with pagination', async ({ apiClient }) => {
    const response = await apiClient.get(`${INSIGHTS_API_PATH}?perPage=2&page=1`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.page).toBe(1);
    expect(response.body.perPage).toBe(2);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.total).toBeGreaterThanOrEqual(3);
  });

  apiTest('should filter insights by status', async ({ apiClient }) => {
    const response = await apiClient.get(`${INSIGHTS_API_PATH}?status=dismissed`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of response.body.items) {
      expect(item.status).toBe('dismissed');
    }
  });

  apiTest('should get an insight by ID', async ({ apiClient }) => {
    const response = await apiClient.get(`${INSIGHTS_API_PATH}/scout-insight-1`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.insight_id).toBe('scout-insight-1');
    expect(response.body.status).toBe('open');
  });

  apiTest('should return 404 for an unknown insight ID', async ({ apiClient }) => {
    const response = await apiClient.get(`${INSIGHTS_API_PATH}/nonexistent-id`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should update insight status from open to dismissed', async ({ apiClient }) => {
    const updateResponse = await apiClient.put(`${INSIGHTS_API_PATH}/scout-insight-2/status`, {
      headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { status: 'dismissed' },
      responseType: 'json',
    });

    expect(updateResponse).toHaveStatusCode(204);

    const getResponse = await apiClient.get(`${INSIGHTS_API_PATH}/scout-insight-2`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.status).toBe('dismissed');
  });

  apiTest('should return 404 when updating status of unknown insight', async ({ apiClient }) => {
    const response = await apiClient.put(`${INSIGHTS_API_PATH}/nonexistent-id/status`, {
      headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { status: 'applied' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
