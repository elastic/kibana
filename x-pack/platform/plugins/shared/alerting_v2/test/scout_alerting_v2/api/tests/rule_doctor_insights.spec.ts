/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

const SEEDED_INSIGHT_COUNT = 3;

apiTest.describe('Rule Doctor insights API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    adminHeaders = { ...adminCredentials.apiKeyHeader };

    await apiServices.alertingV2.insights.cleanUp();
    await apiServices.alertingV2.insights.seed([
      { insight_id: 'scout-insight-1', status: 'open', type: 'coverage_gap' },
      { insight_id: 'scout-insight-2', status: 'open', type: 'deduplication' },
      { insight_id: 'scout-insight-3', status: 'dismissed', type: 'coverage_gap' },
    ]);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.insights.cleanUp();
  });

  apiTest('should list insights with pagination', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.INSIGHTS_API_PATH}?perPage=2&page=1`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      page: 1,
      perPage: 2,
      total: SEEDED_INSIGHT_COUNT,
      items: expect.arrayContaining([]),
    });
    expect(response.body.items).toHaveLength(2);
  });

  apiTest('should filter insights by status', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.INSIGHTS_API_PATH}?status=dismissed`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of response.body.items) {
      expect(item.status).toBe('dismissed');
    }
  });

  apiTest('should get an insight by ID', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.INSIGHTS_API_PATH}/scout-insight-1`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      insight_id: 'scout-insight-1',
      status: 'open',
      type: 'coverage_gap',
    });
  });

  apiTest('should return 404 for an unknown insight ID', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.INSIGHTS_API_PATH}/nonexistent-id`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should update insight status from open to dismissed', async ({ apiClient }) => {
    const updateResponse = await apiClient.put(
      `${testData.INSIGHTS_API_PATH}/scout-insight-2/status`,
      {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: { status: 'dismissed' },
        responseType: 'json',
      }
    );

    expect(updateResponse).toHaveStatusCode(204);

    const getResponse = await apiClient.get(`${testData.INSIGHTS_API_PATH}/scout-insight-2`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.status).toBe('dismissed');
  });

  apiTest('should return 404 when updating status of unknown insight', async ({ apiClient }) => {
    const response = await apiClient.put(`${testData.INSIGHTS_API_PATH}/nonexistent-id/status`, {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { status: 'applied' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
