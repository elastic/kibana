/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleApiCredentials, apiTest, expect } from '@kbn/scout';
import { COMMON_HEADERS, TEST_INPUT } from '../fixtures/constants';

apiTest.describe(
  'POST api/painless_lab/execute',
  { tag: ['@ess', '@svlSecurity', '@svlOblt'] },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });
    apiTest('should execute a valid painless script', async ({ apiClient }) => {
      const response = await apiClient.post('api/painless_lab/execute', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: TEST_INPUT.script,
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        result: 'true',
      });
    });

    apiTest('should return error response for invalid painless script', async ({ apiClient }) => {
      const response = await apiClient.post('api/painless_lab/execute', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: TEST_INPUT.invalid_script,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.error.reason).toBe('compile error');
    });
  }
);
