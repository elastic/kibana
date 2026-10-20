/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/api';

import {
  apiTest,
  ORG_ADMIN_HEADERS,
  OUTLIVE_UIAM_TOKEN_MS,
  OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS,
} from '../fixtures';
const uniqueName = () => `sa-uiam-renewal-${randomUUID()}`;

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Renew UIAM service account workload tokens',
  { tag: ['@local-serverless-search'] },
  () => {
    const roleName = uniqueName();
    let accountId: string;
    let endpoint: string;

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
    });

    apiTest.beforeEach(async ({ apiClient, uiamServiceAccounts }) => {
      endpoint = `internal/service_accounts_test/${uniqueName()}`;
      ({ id: accountId } = await uiamServiceAccounts.create({
        name: uniqueName(),
        roles: [roleName],
      }));
      const bound = await apiClient.post(endpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'bind', serviceAccountId: accountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
    });

    apiTest.afterEach(async ({ apiClient }) => {
      const unbound = await apiClient.post(endpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'unbind' },
        responseType: 'json',
      });
      expect(unbound).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ esClient }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Renewal fixture cleanup failed.')
          );
        }
      }
      if (failures.length)
        throw new AggregateError(failures, 'UIAM service account renewal cleanup failed.');
    });

    apiTest(
      'renews an expired token transparently on an existing scoped ES client',
      async ({ apiClient }) => {
        apiTest.setTimeout(OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS);
        const executed = await apiClient.post(endpoint, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute', waitMs: OUTLIVE_UIAM_TOKEN_MS },
          responseType: 'json',
        });
        expect(executed).toHaveStatusCode(200);
        expect(executed.body).toMatchObject({
          username: accountId,
          renewedUsername: accountId,
          tokenChanged: true,
          principal: {
            type: 'service_account',
            variant: 'uiam',
            serviceAccountId: accountId,
          },
          renewedPrincipal: {
            type: 'service_account',
            variant: 'uiam',
            serviceAccountId: accountId,
          },
        });
      }
    );

    apiTest(
      'unbind denies renewal while leaving the issued token valid until expiry',
      async ({ apiClient }) => {
        apiTest.setTimeout(OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS);
        const executed = await apiClient.post(endpoint, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute', revoke: 'unbind', waitMs: OUTLIVE_UIAM_TOKEN_MS },
          responseType: 'json',
        });
        expect(executed).toHaveStatusCode(200);
        expect(executed.body).toStrictEqual({
          username: accountId,
          afterChangeUsername: accountId,
          renewalStatus: 401,
        });
        const newExecution = await apiClient.post(endpoint, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute' },
          responseType: 'json',
        });
        expect(newExecution).toHaveStatusCode(404);
      }
    );
  }
);
