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
  RULE_DOCTOR_RUN_API_PATH,
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
} from '../fixtures';

apiTest.describe('Rule Doctor run API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    viewerCredentials = await requestAuth.getApiKeyForViewer();

    await kbnClient.uiSettings.update({
      [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
    });
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
    });
  });

  apiTest('should accept a deduplication run and return 202', async ({ apiClient }) => {
    const response = await apiClient.post(RULE_DOCTOR_RUN_API_PATH, {
      headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { type: 'deduplication' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(202);
    expect(response.body.execution_id).toBeDefined();
    expect(response.body.type).toBe('deduplication');
  });

  apiTest('should reject an invalid analysis type with 400', async ({ apiClient }) => {
    const response = await apiClient.post(RULE_DOCTOR_RUN_API_PATH, {
      headers: { ...API_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { type: 'invalid_type' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 403 for a viewer without write privileges', async ({ apiClient }) => {
    const response = await apiClient.post(RULE_DOCTOR_RUN_API_PATH, {
      headers: { ...API_HEADERS, ...viewerCredentials.apiKeyHeader },
      body: { type: 'deduplication' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
