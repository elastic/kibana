/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleApiCredentials, apiTest, expect } from '@kbn/scout';

const script =
  '"{\\n  \\"script\\": {\\n    \\"source\\": \\"return true;\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"';
const invalidScript =
  '"{\\n  \\"script\\": {\\n    \\"source\\": \\"foobar\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"';

const commonHeaders = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

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
          ...commonHeaders,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: script,
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        result: 'true',
      });
    });

    apiTest('should return error response for invalid painless script', async ({ apiClient }) => {
      const response = await apiClient.post('api/painless_lab/execute', {
        headers: {
          ...commonHeaders,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: invalidScript,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.error.reason).toBe('compile error');
    });
  }
);

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
          ...commonHeaders,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: script,
      });
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Not Found');
    });
  }
);
