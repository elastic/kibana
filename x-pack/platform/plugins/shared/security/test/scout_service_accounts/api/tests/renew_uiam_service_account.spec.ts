/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { deleteUiamServiceAccount } from '../fixtures/uiam_service_account_cleanup';
import {
  createUiamServiceAccount,
  ORG_ADMIN_HEADERS,
} from '../fixtures/uiam_service_account_create';

// The config set issues one-minute exchange tokens, and UIAM allows 2s of clock skew. Tests that
// wait this long raise their own timeout above the 60s default.
const OUTLIVE_TOKEN_MS = 65000;
const RENEWAL_TEST_TIMEOUT_MS = 180_000;
const uniqueName = () => `sa-uiam-renewal-${randomUUID()}`;

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Renew UIAM service account workload tokens',
  { tag: ['@local-serverless-search'] },
  () => {
    const accountIds: string[] = [];
    const roleName = uniqueName();
    let accountId: string;
    let endpoint: string;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      // Interactive login seeds the local UIAM organization key used by this suite.
      await samlAuth.asInteractiveUser('admin');
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      endpoint = `internal/service_accounts_test/${uniqueName()}`;
      accountId = await createUiamServiceAccount(apiClient, {
        name: uniqueName(),
        roles: [roleName],
      });
      accountIds.push(accountId);
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
        ...accountIds.map((id) => async () => deleteUiamServiceAccount(id)),
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
        apiTest.setTimeout(RENEWAL_TEST_TIMEOUT_MS);
        const executed = await apiClient.post(endpoint, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute', waitMs: OUTLIVE_TOKEN_MS },
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
        apiTest.setTimeout(RENEWAL_TEST_TIMEOUT_MS);
        const executed = await apiClient.post(endpoint, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute', revoke: 'unbind', waitMs: OUTLIVE_TOKEN_MS },
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
