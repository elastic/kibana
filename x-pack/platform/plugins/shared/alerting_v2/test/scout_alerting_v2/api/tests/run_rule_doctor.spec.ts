/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { RULE_DOCTOR_DEDUP_WORKFLOW_ID } from '../../../../server/workflows/load_workflows';
import { apiTest, testData } from '../fixtures';
import { RULE_DOCTOR_RUN_API_PATH } from '../../common/constants';

apiTest.describe('Rule Doctor run API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.afterAll(async ({ apiClient }) => {
    await apiClient.delete(`/api/workflows/workflow/${RULE_DOCTOR_DEDUP_WORKFLOW_ID}?force=true`, {
      headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
    });
  });

  apiTest('should accept a deduplication run and return 202', async ({ apiClient }) => {
    const response = await apiClient.post(RULE_DOCTOR_RUN_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { type: 'deduplication' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(202);
    expect(response.body.execution_id).toBeDefined();
    expect(response.body.type).toBe('deduplication');
  });

  apiTest('should reject an invalid analysis type with 400', async ({ apiClient }) => {
    const response = await apiClient.post(RULE_DOCTOR_RUN_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { type: 'invalid_type' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.statusCode).toBe(400);
    expect(typeof response.body.message).toBe('string');
  });

  apiTest('should return 403 for a viewer without write privileges', async ({ apiClient }) => {
    const response = await apiClient.post(RULE_DOCTOR_RUN_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      body: { type: 'deduplication' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
