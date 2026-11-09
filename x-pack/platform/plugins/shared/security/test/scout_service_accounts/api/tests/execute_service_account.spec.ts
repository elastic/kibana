/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const uniqueName = () => `sa-execution-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

apiTest.describe(
  'Execute Elasticsearch service account workloads',
  { tag: ['@local-stateful-classic'] },
  () => {
    const accounts: ServiceAccountPrincipal[] = [];
    const roleName = uniqueName();
    const spaceId = uniqueName();
    let name: string;
    let accountId: string;
    let endpoint: string;
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, apiServices }) => {
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
      await apiServices.spaces.create({ id: spaceId, name: 'Service account execution' });
    });

    apiTest.beforeEach(async ({ apiClient, samlAuth }) => {
      headers = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
      name = uniqueName();
      accountId = `kibana/${name}`;
      endpoint = `internal/service_accounts_test/${name}`;
      accounts.push({ namespace: 'kibana', name });
      const created = await apiClient.post('internal/security/service_account', {
        headers,
        body: { name, roles: [roleName] },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      const bound = await apiClient.post(endpoint, {
        headers,
        body: { operation: 'bind', serviceAccountId: accountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
    });

    apiTest.afterEach(async ({ apiClient, samlAuth }) => {
      const cleanupHeaders = {
        ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
        ...HEADERS,
      };
      for (const path of [endpoint, `s/${spaceId}/${endpoint}`]) {
        const unbound = await apiClient.post(path, {
          headers: cleanupHeaders,
          body: { operation: 'unbind' },
          responseType: 'json',
        });
        expect(unbound).toHaveStatusCode(200);
      }
    });

    apiTest.afterAll(async ({ esClient, config, apiServices }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () => {
          for (const { namespace, name: serviceName } of accounts) {
            await esClient.security.invalidateToken({
              username: `${namespace}/${serviceName}`,
              realm_name: '_service_account',
            });
          }
        },
        async () => deleteServiceAccounts(esClient, config, accounts),
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
        throw new AggregateError(failures, 'Service account execution cleanup failed.');
    });

    apiTest('uses the account identity and permits only its own roles', async ({ apiClient }) => {
      const allowed = await apiClient.post(endpoint, {
        headers,
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
          variant: 'stack',
          serviceAccountId: accountId,
        },
      });
      const denied = await apiClient.post(endpoint, {
        headers,
        body: { operation: 'execute', action: 'read_role' },
        responseType: 'json',
      });
      expect(denied).toHaveStatusCode(403);
    });

    apiTest(
      'renews an expired token transparently on an existing scoped ES client',
      async ({ apiClient }) => {
        const executed = await apiClient.post(endpoint, {
          headers,
          body: { operation: 'execute', waitMs: 16000 },
          responseType: 'json',
        });
        expect(executed).toHaveStatusCode(200);
        expect(executed.body).toMatchObject({
          username: accountId,
          renewedUsername: accountId,
          tokenChanged: true,
          principal: {
            type: 'service_account',
            variant: 'stack',
            serviceAccountId: accountId,
          },
          renewedPrincipal: {
            type: 'service_account',
            variant: 'stack',
            serviceAccountId: accountId,
          },
        });
      }
    );

    apiTest('isolates workload bindings by space', async ({ apiClient }) => {
      const otherEndpoint = `s/${spaceId}/${endpoint}`;
      const missing = await apiClient.post(otherEndpoint, {
        headers,
        body: { operation: 'execute' },
        responseType: 'json',
      });
      expect(missing).toHaveStatusCode(404);
      const bound = await apiClient.post(otherEndpoint, {
        headers,
        body: { operation: 'bind', serviceAccountId: accountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
      const executed = await apiClient.post(otherEndpoint, {
        headers,
        body: { operation: 'execute' },
        responseType: 'json',
      });
      expect(executed).toHaveStatusCode(200);
      expect(executed.body).toMatchObject({ username: accountId, spaceId });
    });

    for (const revoke of ['unbind', 'disable', 'delete_token'] as const) {
      apiTest(
        `${revoke} denies renewal while leaving the issued token valid until expiry`,
        async ({ apiClient }) => {
          const executed = await apiClient.post(endpoint, {
            headers,
            body: { operation: 'execute', revoke, waitMs: 16000 },
            responseType: 'json',
          });
          expect(executed).toHaveStatusCode(200);
          expect(executed.body).toStrictEqual({
            username: accountId,
            afterChangeUsername: accountId,
            renewalStatus: 401,
          });
          const newExecution = await apiClient.post(endpoint, {
            headers,
            body: { operation: 'execute' },
            responseType: 'json',
          });
          expect(newExecution).toHaveStatusCode(revoke === 'unbind' ? 404 : 500);
        }
      );
    }

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
