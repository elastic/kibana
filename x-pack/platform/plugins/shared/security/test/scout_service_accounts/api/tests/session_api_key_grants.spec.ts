/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

apiTest.describe(
  'Task scheduling with an expired session access token',
  { tag: ['@local-stateful-classic'] },
  () => {
    apiTest(
      'renews the caller session before granting a task API key',
      async ({ apiClient, samlAuth, esClient, kbnClient }) => {
        apiTest.setTimeout(60_000);
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = {
          ...cookieHeader,
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
        };
        const user = await apiClient.get('internal/security/me', { headers, responseType: 'json' });
        expect(user).toHaveStatusCode(200);
        // The stateful service_accounts config expires ES access tokens after 15 seconds.
        // Waiting inside the handler also prevents HTTP authentication from hiding the regression.
        const response = await apiClient.post(
          'internal/service_accounts_test/_tasks?waitMs=20000',
          {
            headers,
            responseType: 'json',
          }
        );
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        try {
          expect(typeof response.body.apiKeyId).toBe('string');
          const getKeys = async () => {
            const { api_keys: keys } = await esClient.security.getApiKey(
              { id: response.body.apiKeyId },
              { ignore: [404] }
            );
            return keys;
          };
          // Task Manager grants with refresh:false; wait until the new key is searchable.
          await expect.poll(getKeys, { timeout: 15_000 }).toHaveLength(1);
          expect((await getKeys())[0]).toMatchObject({
            username: user.body.username,
            invalidated: false,
          });
        } finally {
          await kbnClient.request({
            method: 'DELETE',
            path: `/internal/service_accounts_test/_tasks/${response.body.id}`,
          });
        }
      }
    );
  }
);
