/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleApiCredentials, apiTest, expect } from '@kbn/scout';
import { COMMON_HEADERS, TEST_INPUT } from '../fixtures/constants';

apiTest.describe(
  '[search serverless] POST api/painless_lab/execute',
  { tag: ['@svlSearch'] },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });
    apiTest('should return 404', async ({ apiClient }) => {
      const response = await apiClient.post('api/painless_lab/execute', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: TEST_INPUT.script,
      });
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Not Found');
    });
  }
);
