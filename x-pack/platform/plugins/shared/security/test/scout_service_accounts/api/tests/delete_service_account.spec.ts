/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
/** A token minted straight through Elasticsearch, which Kibana did not create. */
const OPERATOR_TOKEN_NAME = 'operator-token';

const uniqueName = () => `sa-delete-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const accountPath = (id: string) => `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;
/** The test plugin's endpoint for its `job` workload with the given id. */
const workloadPath = (workloadId: string) => `internal/service_accounts_test/${workloadId}`;

apiTest.describe(
  'Delete Elasticsearch service accounts',
  { tag: ['@local-stateful-classic'] },
  () => {
    const created: ServiceAccountPrincipal[] = [];
    const boundWorkloads: string[] = [];
    let adminHeaders: Record<string, string>;

    const createAccount = async (apiClient: ApiClientFixture): Promise<ServiceAccountPrincipal> => {
      const account = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: uniqueName() };
      created.push(account);
      const response = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        body: { name: account.name, roles: ['viewer'] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return account;
    };

    const idOf = ({ namespace, name }: ServiceAccountPrincipal) => `${namespace}/${name}`;

    apiTest.beforeEach(async ({ samlAuth }) => {
      adminHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
    });

    apiTest.afterAll(async ({ apiClient, esClient, config, samlAuth }) => {
      const failures: Error[] = [];
      const headers = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
      const cleanup = [
        async () => {
          for (const workloadId of boundWorkloads) {
            const unbound = await apiClient.post(workloadPath(workloadId), {
              headers,
              body: { operation: 'unbind' },
              responseType: 'json',
            });
            expect(unbound).toHaveStatusCode(200);
          }
        },
        async () => {
          for (const { namespace, name } of created) {
            await esClient.security.deleteServiceToken(
              { namespace, service: name, name: OPERATOR_TOKEN_NAME },
              { ignore: [404] }
            );
          }
        },
        async () => deleteServiceAccounts(esClient, config, created),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Delete fixture cleanup failed.')
          );
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'Service account delete cleanup failed.');
      }
    });

    apiTest(
      'deletes an unbound account along with the credential Kibana stored',
      async ({ apiClient, esClient }) => {
        const account = await createAccount(apiClient);

        const deleted = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(deleted).toHaveStatusCode(200);
        expect(deleted.body).toStrictEqual({ warnings: [] });

        const fetched = await apiClient.get(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(fetched).toHaveStatusCode(404);

        const stored = await esClient.transport.request({
          method: 'GET',
          path: `/_security/service/${account.namespace}/${account.name}`,
          querystring: { type: 'user_managed' },
        });
        expect(stored).toStrictEqual({});

        // A second delete only answers 404 when the credential is gone too: a lingering one would
        // be cleaned up and answered with a 200.
        const repeated = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(repeated).toHaveStatusCode(404);
      }
    );

    apiTest(
      'deletes tokens Kibana did not mint, so the name can be used again',
      async ({ apiClient, esClient }) => {
        const account = await createAccount(apiClient);
        await esClient.security.createServiceToken({
          namespace: account.namespace,
          service: account.name,
          name: OPERATOR_TOKEN_NAME,
        });

        const deleted = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(deleted).toHaveStatusCode(200);
        expect(deleted.body).toStrictEqual({ warnings: [] });

        const recreated = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
          headers: adminHeaders,
          body: { name: account.name, roles: ['viewer'] },
          responseType: 'json',
        });
        expect(recreated).toHaveStatusCode(200);
      }
    );

    apiTest(
      'refuses to delete a bound account unless forced, and lists what is bound',
      async ({ apiClient }) => {
        const account = await createAccount(apiClient);
        const workloadId = uniqueName();
        boundWorkloads.push(workloadId);
        const bound = await apiClient.post(workloadPath(workloadId), {
          headers: adminHeaders,
          body: { operation: 'bind', serviceAccountId: idOf(account) },
          responseType: 'json',
        });
        expect(bound).toHaveStatusCode(200);

        const expectedWorkloads = [
          {
            pluginId: 'serviceAccountsTest',
            workloadType: 'job',
            workloadId,
            spaceId: 'default',
            displayName: workloadId,
          },
        ];

        const listed = await apiClient.get(`${accountPath(idOf(account))}/workloads`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(listed).toHaveStatusCode(200);
        expect(listed.body).toStrictEqual({ workloads: expectedWorkloads });

        const refused = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(refused).toHaveStatusCode(409);
        expect(refused.body).toMatchObject({
          message: `Service account [${idOf(
            account
          )}] is still bound to 1 workload. Unbind them first.`,
          attributes: { workloads: expectedWorkloads },
        });

        const stillThere = await apiClient.get(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(stillThere).toHaveStatusCode(200);

        const forced = await apiClient.delete(`${accountPath(idOf(account))}?force=true`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(forced).toHaveStatusCode(200);
        expect(forced.body).toStrictEqual({ warnings: [] });

        const gone = await apiClient.get(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(gone).toHaveStatusCode(404);
      }
    );

    apiTest('answers 404 for an account that does not exist', async ({ apiClient }) => {
      const response = await apiClient.delete(
        accountPath(`${ES_SERVICE_ACCOUNT_NAMESPACE}/${uniqueName()}`),
        { headers: adminHeaders, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest(
      'refuses a caller without `manage_security`, and leaves the account in place',
      async ({ apiClient, samlAuth }) => {
        const account = await createAccount(apiClient);
        const viewerHeaders = {
          ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
          ...HEADERS,
        };

        const refused = await apiClient.delete(accountPath(idOf(account)), {
          headers: viewerHeaders,
          responseType: 'json',
        });
        expect(refused).toHaveStatusCode(403);

        const workloads = await apiClient.get(`${accountPath(idOf(account))}/workloads`, {
          headers: viewerHeaders,
          responseType: 'json',
        });
        expect(workloads).toHaveStatusCode(403);

        const stillThere = await apiClient.get(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(stillThere).toHaveStatusCode(200);
      }
    );
  }
);
