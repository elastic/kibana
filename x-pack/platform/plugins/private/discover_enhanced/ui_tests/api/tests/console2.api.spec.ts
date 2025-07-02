/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleApiCredentials, apiTest, expect, tags } from '@kbn/scout';

apiTest.describe('Console APIs', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let adminApiCredentials: RoleApiCredentials;
  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });
  apiTest('GET api/console/api_server', async ({ apiClient }) => {
    const response = await apiClient.get('api/console/api_server', {
      headers: {
        'kbn-xsrf': 'some-xsrf-token',
        'x-elastic-internal-origin': 'kibana',
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    const responseBody = response.body as {
      es: { name: string; globals: Record<string, unknown>; endpoints: Record<string, unknown> };
    };
    expect(responseBody.es).toBeDefined();
    expect(responseBody.es.name).toBeDefined();
    expect(Object.keys(responseBody.es.globals).length).toBeGreaterThan(0);
    expect(Object.keys(responseBody.es.endpoints).length).toBeGreaterThan(0);
  });

  apiTest('system indices behavior', async ({ apiClient }) => {
    const response = await apiClient.post('api/console/proxy?method=GET&path=/.kibana/_settings', {
      headers: {
        'kbn-xsrf': 'some-xsrf-token',
        'x-elastic-internal-origin': 'kibana',
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers.warning).toBeDefined();
  });
});
