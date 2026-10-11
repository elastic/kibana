/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';

import type { ApiClientFixture, EsClient } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
import { BINDING_CLOCK_SKEW_TOLERANCE_MS } from '../../../../server/service_accounts/credentials';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';
import {
  type TestWorkload,
  unbindWorkloads,
  workloadPath,
} from '../fixtures/service_account_workloads';

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
/** A token minted straight through Elasticsearch, which Kibana did not create. */
const OPERATOR_TOKEN_NAME = 'operator-token';

const uniqueName = () => `sa-delete-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const accountPath = (id: string) => `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;

apiTest.describe(
  'Delete Elasticsearch service accounts',
  { tag: ['@local-stateful-classic'] },
  () => {
    const created: ServiceAccountPrincipal[] = [];
    const boundWorkloads: TestWorkload[] = [];
    const createdSpaces: string[] = [];
    /** Grants `monitor`, which is what the test plugin's workload needs to run. */
    const workloadRole = uniqueName();
    let adminHeaders: Record<string, string>;

    const idOf = ({ namespace, name }: ServiceAccountPrincipal) => `${namespace}/${name}`;

    const createAccount = async (
      apiClient: ApiClientFixture,
      name: string = uniqueName()
    ): Promise<ServiceAccountPrincipal> => {
      const account = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name };
      created.push(account);
      const response = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        body: { name, roles: [workloadRole] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return account;
    };

    const runWorkload = (apiClient: ApiClientFixture, workloadId: string) =>
      apiClient.post(workloadPath(workloadId), {
        headers: adminHeaders,
        body: { operation: 'execute' },
        responseType: 'json',
      });

    const bindWorkload = async (
      apiClient: ApiClientFixture,
      workloadId: string,
      account: ServiceAccountPrincipal,
      spaceId?: string
    ) => {
      boundWorkloads.push({ workloadId, spaceId });
      const bound = await apiClient.post(workloadPath(workloadId, spaceId), {
        headers: adminHeaders,
        body: { operation: 'bind', serviceAccountId: idOf(account) },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
    };

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.security.putRole({
        name: workloadRole,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
    });

    apiTest.beforeEach(async ({ samlAuth }) => {
      adminHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
    });

    apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () => unbindWorkloads(kbnClient, boundWorkloads),
        async () => {
          for (const spaceId of createdSpaces) {
            await kbnClient.spaces.delete(spaceId);
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
        async () => esClient.security.deleteRole({ name: workloadRole, refresh: 'wait_for' }),
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
        await bindWorkload(apiClient, workloadId, account);

        const expectedWorkloads = [
          {
            pluginId: 'serviceAccountsTest',
            workloadType: 'job',
            workloadId,
            displayName: `Test job ${workloadId}`,
            typeName: 'Test job',
            href: `/app/service_accounts_test/jobs/${workloadId}`,
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

    apiTest(
      'names and links bound workloads through their workload type, in the space of each binding',
      async ({ apiClient, kbnClient }) => {
        const account = await createAccount(apiClient);
        const spaceId = uniqueName();
        createdSpaces.push(spaceId);
        await kbnClient.spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });

        const suffix = uniqueName();
        const linked = `linked-${suffix}`;
        const unresolved = `unresolved-${suffix}`;
        const badPath = `bad-path-${suffix}`;
        const titleOnly = `title-only-${suffix}`;
        await bindWorkload(apiClient, linked, account);
        await bindWorkload(apiClient, linked, account, spaceId);
        await bindWorkload(apiClient, unresolved, account);
        await bindWorkload(apiClient, badPath, account);
        await bindWorkload(apiClient, titleOnly, account);

        const job = (workloadId: string) => ({
          pluginId: 'serviceAccountsTest',
          workloadType: 'job',
          workloadId,
          typeName: 'Test job',
        });
        const byLink = <T extends { workloadId: string; href?: string }>(workloads: T[]) =>
          [...workloads].sort((a, b) =>
            `${a.workloadId}${a.href}`.localeCompare(`${b.workloadId}${b.href}`)
          );
        const expectedWorkloads = byLink([
          {
            ...job(linked),
            displayName: `Test job ${linked}`,
            href: `/app/service_accounts_test/jobs/${linked}`,
          },
          {
            ...job(linked),
            displayName: `Test job ${linked}`,
            href: `/s/${spaceId}/app/service_accounts_test/jobs/${linked}`,
          },
          // The workload type has nothing for it.
          { ...job(unresolved), displayName: unresolved },
          // The workload type returned a path Core refuses, so its title goes too.
          { ...job(badPath), displayName: badPath },
          { ...job(titleOnly), displayName: `Test job ${titleOnly}` },
        ]);

        const listed = await apiClient.get(`${accountPath(idOf(account))}/workloads`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(listed).toHaveStatusCode(200);
        expect(byLink(listed.body.workloads)).toStrictEqual(expectedWorkloads);

        const refused = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(refused).toHaveStatusCode(409);
        expect(byLink(refused.body.attributes.workloads)).toStrictEqual(expectedWorkloads);
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

    apiTest(
      'does not let an account created again under the same name run the old one’s workloads',
      async ({ apiClient }) => {
        const account = await createAccount(apiClient);
        const workloadId = uniqueName();
        await bindWorkload(apiClient, workloadId, account);
        expect(await runWorkload(apiClient, workloadId)).toHaveStatusCode(200);

        // An account created again within the tolerance of a bind still inherits the binding.
        await setTimeout(BINDING_CLOCK_SKEW_TOLERANCE_MS + 1_000);

        const forced = await apiClient.delete(`${accountPath(idOf(account))}?force=true`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(forced).toHaveStatusCode(200);
        await createAccount(apiClient, account.name);

        // The binding still names `kibana/<name>`, but it was made for the deleted account.
        expect(await runWorkload(apiClient, workloadId)).toHaveStatusCode(500);

        // Binding it again is what lets it run as the new account.
        await bindWorkload(apiClient, workloadId, account);
        const rebound = await runWorkload(apiClient, workloadId);
        expect(rebound).toHaveStatusCode(200);
        expect(rebound.body).toMatchObject({ username: idOf(account) });
      }
    );

    apiTest(
      'deletes the tokens a forced delete left behind, so the name can be used again',
      async ({ apiClient, esClient }) => {
        const account = await createAccount(apiClient);
        // Forced straight through Elasticsearch, which leaves Kibana's token behind.
        await esClient.transport.request({
          method: 'DELETE',
          path: `/_security/service/${account.namespace}/${account.name}`,
          querystring: { force: 'true' },
        });

        const cleaned = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(cleaned).toHaveStatusCode(200);
        expect(cleaned.body).toStrictEqual({ warnings: [] });

        const repeated = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(repeated).toHaveStatusCode(404);

        await createAccount(apiClient, account.name);
      }
    );

    /**
     * Issues an access token for the account through the token grant, from a service token minted
     * straight through Elasticsearch, and returns a check of who it authenticates as.
     */
    const issueAccessToken = async (esClient: EsClient, account: ServiceAccountPrincipal) => {
      const { token } = await esClient.security.createServiceToken({
        namespace: account.namespace,
        service: account.name,
        name: OPERATOR_TOKEN_NAME,
      });
      const { access_token: accessToken } = await esClient.transport.request<{
        access_token: string;
      }>({
        method: 'POST',
        path: '/_security/oauth2/token',
        body: { grant_type: '_user_managed_service_account', service_account_token: token.value },
      });
      return () =>
        esClient.transport.request(
          { method: 'GET', path: '/_security/_authenticate' },
          { headers: { authorization: `Bearer ${accessToken}` }, ignore: [401] }
        );
    };

    apiTest(
      'stops access tokens issued before the delete from authenticating',
      async ({ apiClient, esClient }) => {
        const account = await createAccount(apiClient);
        const authenticate = await issueAccessToken(esClient, account);
        expect(await authenticate()).toMatchObject({ username: idOf(account) });

        const deleted = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(deleted).toHaveStatusCode(200);
        expect(deleted.body).toStrictEqual({ warnings: [] });

        expect(await authenticate()).not.toMatchObject({ username: idOf(account) });
      }
    );

    apiTest(
      'invalidates the access tokens of an account deleted straight through Elasticsearch',
      async ({ apiClient, esClient }) => {
        const account = await createAccount(apiClient);
        const authenticate = await issueAccessToken(esClient, account);
        await esClient.transport.request({
          method: 'DELETE',
          path: `/_security/service/${account.namespace}/${account.name}`,
          querystring: { force: 'true' },
        });

        // Deleting the account does not invalidate what it was issued.
        expect(await authenticate()).toMatchObject({ username: idOf(account) });

        const cleaned = await apiClient.delete(accountPath(idOf(account)), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(cleaned).toHaveStatusCode(200);
        expect(cleaned.body).toStrictEqual({ warnings: [] });

        expect(await authenticate()).not.toMatchObject({ username: idOf(account) });
      }
    );

    apiTest(
      'refuses to create an account while tokens are left over from one with the same name',
      async ({ apiClient, esClient }) => {
        const account = await createAccount(apiClient);
        // Forced straight through Elasticsearch, which leaves Kibana's token behind.
        await esClient.transport.request({
          method: 'DELETE',
          path: `/_security/service/${account.namespace}/${account.name}`,
          querystring: { force: 'true' },
        });

        const recreated = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
          headers: adminHeaders,
          body: { name: account.name, roles: [workloadRole] },
          responseType: 'json',
        });
        expect(recreated).toHaveStatusCode(400);
      }
    );
  }
);
