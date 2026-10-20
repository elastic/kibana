/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const taskSchedulingTimeout = 60_000;
const grantedKeyVisibilityTimeout = 15_000;

apiTest.describe(
  'Task scheduling with an expired session access token',
  { tag: ['@local-stateful-classic'] },
  () => {
    for (const scenario of [
      { name: 'one grant', query: '', count: 1 },
      { name: 'sequential grants', query: '&count=3', count: 3 },
      { name: 'concurrent grants', query: '&count=3&concurrent=true', count: 3 },
      {
        name: 'a scoped refresh followed by grants',
        query: '&count=3&authenticateFirst=true',
        count: 3,
      },
    ]) {
      apiTest(
        `renews the caller session for ${scenario.name}`,
        async ({ apiClient, samlAuth, esClient, kbnClient }) => {
          apiTest.setTimeout(taskSchedulingTimeout);
          const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
          const headers = {
            ...cookieHeader,
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': 'kibana',
          };
          const user = await apiClient.get('internal/security/me', {
            headers,
            responseType: 'json',
          });
          expect(user).toHaveStatusCode(200);
          // The stateful service_accounts config expires ES access tokens after 15 seconds.
          // Wait inside the handler, so HTTP authentication cannot renew the token first.
          const response = await apiClient.post(
            `internal/service_accounts_test/_tasks?waitMs=20000${scenario.query}`,
            {
              headers,
              responseType: 'json',
            }
          );
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
          const tasks: Array<{ id: string; apiKeyId: string }> = [
            response.body,
            ...(response.body.additionalTasks ?? []),
          ];
          try {
            expect(tasks).toHaveLength(scenario.count);
            expect(new Set(tasks.map((task) => task.apiKeyId)).size).toBe(scenario.count);
            for (const task of tasks) {
              expect(typeof task.apiKeyId).toBe('string');
              const getKeys = async () => {
                const { api_keys: keys } = await esClient.security.getApiKey(
                  { id: task.apiKeyId },
                  { ignore: [404] }
                );
                return keys;
              };
              // Task Manager grants with refresh:false; wait until the new key is searchable.
              await expect.poll(getKeys, { timeout: grantedKeyVisibilityTimeout }).toHaveLength(1);
              expect((await getKeys())[0]).toMatchObject({
                username: user.body.username,
                invalidated: false,
              });
            }
          } finally {
            await Promise.all(
              tasks.map((task) =>
                kbnClient.request({
                  method: 'DELETE',
                  path: `/internal/service_accounts_test/_tasks/${task.id}`,
                })
              )
            );
          }
        }
      );
    }
  }
);
