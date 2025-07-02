/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleApiCredentials, apiTest, expect, tags } from '@kbn/scout';

apiTest.describe('Painless APIs', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let adminApiCredentials: RoleApiCredentials;
  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });
  apiTest('POST api/painless_lab/execute', async ({ apiClient }) => {
    const script =
      '"{\\n  \\"script\\": {\\n    \\"source\\": \\"return true;\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"';
    const response = await apiClient.post('api/painless_lab/execute', {
      headers: {
        'kbn-xsrf': 'some-xsrf-token',
        'x-elastic-internal-origin': 'kibana',
        'Content-Type': 'application/json;charset=UTF-8',
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
      body: JSON.stringify(script),
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({
      result: 'true',
    });
  });

  apiTest('system indices behavior', async ({ apiClient }) => {
    const invalidScript =
      '"{\\n  \\"script\\": {\\n    \\"source\\": \\"foobar\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"';

    const response = await apiClient.post('api/painless_lab/execute', {
      headers: {
        'kbn-xsrf': 'some-xsrf-token',
        'x-elastic-internal-origin': 'kibana',
        'Content-Type': 'application/json;charset=UTF-8',
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
      body: JSON.stringify(invalidScript),
    });
    expect(response.statusCode).toBe(200);
  });
});
