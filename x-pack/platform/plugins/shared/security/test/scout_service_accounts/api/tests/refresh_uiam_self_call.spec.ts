/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/api';

import { apiTest, ORG_ADMIN_HEADERS, OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS } from '../fixtures';
import { workloadPath } from '../fixtures/service_account_workloads';

apiTest.describe(
  'Refresh UIAM service account credentials before a self call',
  { tag: ['@local-serverless-search'] },
  () => {
    const name = `sa-uiam-self-call-${randomUUID()}`;
    const endpoint = workloadPath(name);
    let accountId: string;

    apiTest.beforeAll(async ({ apiClient, esClient, uiamServiceAccounts }) => {
      await esClient.security.putRole({
        name,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
      ({ id: accountId } = await uiamServiceAccounts.create({ name, roles: [name] }));
      const bound = await apiClient.post(endpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'bind', serviceAccountId: accountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      try {
        const unbound = await apiClient.post(endpoint, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'unbind' },
          responseType: 'json',
        });
        expect(unbound).toHaveStatusCode(200);
      } finally {
        await esClient.security.deleteRole({ name, refresh: 'wait_for' });
      }
    });

    apiTest('finishes a short handler after its original token expires', async ({ apiClient }) => {
      apiTest.setTimeout(OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS);

      // UIAM tokens live 60s. The original is still valid at dispatch, but cannot cover the 25s
      // handler after aging for 50s. The handler's real incoming request cannot renew its token.
      const executed = await apiClient.post(endpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'execute', action: 'self_call', waitMs: 50_000, holdMs: 25_000 },
        responseType: 'json',
      });

      expect(executed).toHaveStatusCode(200);
      expect(executed.body).toStrictEqual({
        username: accountId,
        tokenChangedBeforeCall: false,
        tokenChanged: true,
        handler: {
          username: accountId,
          completedUsername: accountId,
          isFakeRequest: false,
        },
      });
    });
  }
);
