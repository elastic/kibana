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
  HEADERS,
  ORG_ADMIN_HEADERS,
} from '../fixtures/uiam_service_account_create';

const uniqueName = () => `sa-uiam-execution-${randomUUID()}`;

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Execute UIAM service account workloads',
  { tag: ['@local-serverless-search'] },
  () => {
    const accountIds: string[] = [];
    const roleName = uniqueName();
    const spaceId = uniqueName();
    let accountId: string;
    let endpoint: string;

    apiTest.beforeAll(async ({ esClient, apiServices, samlAuth }) => {
      // Interactive login seeds the local UIAM organization key used by this suite.
      await samlAuth.asInteractiveUser('admin');
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
      await apiServices.spaces.create({ id: spaceId, name: 'UIAM service account execution' });
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
      for (const path of [endpoint, `s/${spaceId}/${endpoint}`]) {
        const unbound = await apiClient.post(path, {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'unbind' },
          responseType: 'json',
        });
        expect(unbound).toHaveStatusCode(200);
      }
    });

    apiTest.afterAll(async ({ esClient, apiServices }) => {
      const failures: Error[] = [];
      const cleanup = [
        ...accountIds.map((id) => async () => deleteUiamServiceAccount(id)),
        async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
        async () => apiServices.spaces.delete(spaceId),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Execution fixture cleanup failed.')
          );
        }
      }
      if (failures.length)
        throw new AggregateError(failures, 'UIAM service account execution cleanup failed.');
    });

    apiTest('uses the account identity and permits only its own roles', async ({ apiClient }) => {
      const allowed = await apiClient.post(endpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'execute' },
        responseType: 'json',
      });
      expect(allowed).toHaveStatusCode(200);
      expect(allowed.body).toMatchObject({
        username: accountId,
        renewedUsername: accountId,
        spaceId: 'default',
        tokenChanged: false,
        principal: {
          type: 'service_account',
          variant: 'uiam',
          serviceAccountId: accountId,
        },
      });
      const denied = await apiClient.post(endpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'execute', action: 'read_role' },
        responseType: 'json',
      });
      expect(denied).toHaveStatusCode(403);
    });

    apiTest('isolates workload bindings by space', async ({ apiClient }) => {
      const otherEndpoint = `s/${spaceId}/${endpoint}`;
      const missing = await apiClient.post(otherEndpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'execute' },
        responseType: 'json',
      });
      expect(missing).toHaveStatusCode(404);
      const bound = await apiClient.post(otherEndpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'bind', serviceAccountId: accountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
      const executed = await apiClient.post(otherEndpoint, {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'execute' },
        responseType: 'json',
      });
      expect(executed).toHaveStatusCode(200);
      expect(executed.body).toMatchObject({ username: accountId, spaceId });
    });

    apiTest(
      'refuses an unauthorized caller before executing a workload',
      async ({ apiClient, samlAuth }) => {
        const viewer = await samlAuth.asInteractiveUser('viewer');
        const response = await apiClient.post(endpoint, {
          headers: { ...viewer.cookieHeader, ...HEADERS },
          body: { operation: 'execute' },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
