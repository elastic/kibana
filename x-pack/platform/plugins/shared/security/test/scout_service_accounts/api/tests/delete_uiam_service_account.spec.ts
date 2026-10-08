/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, randomUUID } from 'crypto';
import { setTimeout } from 'timers/promises';

import { MOCK_IDP_GATEWAY_SHARED_SECRET } from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import {
  apiTest,
  HEADERS,
  ORG_ADMIN_HEADERS,
  OUTLIVE_UIAM_TOKEN_MS,
  OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS,
  SERVICE_ACCOUNT_ENDPOINT,
  serviceAccountPath,
} from '../fixtures';
import { workloadPath } from '../fixtures/service_account_workloads';
import { exchangeUiamServiceAccountToken } from '../fixtures/uiam_service_account_token';

const PRINCIPAL_PATH = 'internal/service_accounts_test/_principal';
const uniqueName = () => `sa-uiam-delete-${randomUUID()}`;

/** Headers that authenticate a request to Kibana with a UIAM service account token. */
const tokenHeaders = (token: string) => ({
  ...HEADERS,
  Authorization: `Bearer ${token}`,
  // Elasticsearch only accepts the token alongside the secret the gateway adds in front of a
  // real project.
  [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
});

/** Reads every page of the directory, so a busy stack can't hide an account on a later page. */
const listAccountIds = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<string[]> => {
  const ids: string[] = [];
  let after: string | undefined;
  do {
    const query = after ? `?after=${encodeURIComponent(after)}` : '';
    const page = await apiClient.get(`${SERVICE_ACCOUNT_ENDPOINT}${query}`, {
      headers,
      responseType: 'json',
    });
    expect(page).toHaveStatusCode(200);
    ids.push(...page.body.serviceAccounts.map(({ id }: { id: string }) => id));
    after = page.body.nextPage;
  } while (after);
  return ids;
};

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe('Delete UIAM service accounts', { tag: ['@local-serverless-search'] }, () => {
  const boundWorkloads: string[] = [];
  const apiKeyIds: string[] = [];
  /** Grants `monitor`, which is what the test plugin's workload needs to run. */
  const workloadRole = uniqueName();
  let adminHeaders: Record<string, string>;

  const runWorkload = (apiClient: ApiClientFixture, workloadId: string) =>
    apiClient.post(workloadPath(workloadId), {
      headers: adminHeaders,
      body: { operation: 'execute' },
      responseType: 'json',
    });

  apiTest.beforeAll(async ({ esClient }) => {
    await esClient.security.putRole({
      name: workloadRole,
      cluster: ['monitor'],
      refresh: 'wait_for',
    });
  });

  apiTest.beforeEach(async ({ samlAuth }) => {
    // UIAM authorizes a delete against Kibana's certificate, so unlike create, a session user
    // can delete an account.
    adminHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    const failures: Error[] = [];
    const cleanup = [
      ...boundWorkloads.map((workloadId) => async () => {
        const unbound = await apiClient.post(workloadPath(workloadId), {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'unbind' },
          responseType: 'json',
        });
        expect(unbound).toHaveStatusCode(200);
      }),
      async () => {
        if (apiKeyIds.length) await esClient.security.invalidateApiKey({ ids: apiKeyIds });
      },
      async () => esClient.security.deleteRole({ name: workloadRole, refresh: 'wait_for' }),
    ];
    for (const remove of cleanup) {
      try {
        await remove();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error('Delete fixture cleanup failed.'));
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, 'UIAM service account delete cleanup failed.');
    }
  });

  apiTest(
    'deletes an unbound account, which get and list stop returning',
    async ({ apiClient, uiamServiceAccounts }) => {
      const { id } = await uiamServiceAccounts.create({
        name: uniqueName(),
        roles: [workloadRole],
      });
      expect(await listAccountIds(apiClient, adminHeaders)).toContain(id);

      const deleted = await apiClient.delete(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(deleted).toHaveStatusCode(200);
      expect(deleted.body).toStrictEqual({ warnings: [] });

      const fetched = await apiClient.get(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(fetched).toHaveStatusCode(404);
      expect(await listAccountIds(apiClient, adminHeaders)).not.toContain(id);

      // UIAM keeps a revoked account for a while, and revoking it again succeeds.
      const repeated = await apiClient.delete(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(repeated).toHaveStatusCode(200);
      expect(repeated.body).toStrictEqual({ warnings: [] });
    }
  );

  apiTest(
    'refuses to delete a bound account unless forced, and the workload stops running',
    async ({ apiClient, uiamServiceAccounts }) => {
      const { id } = await uiamServiceAccounts.create({
        name: uniqueName(),
        roles: [workloadRole],
      });
      const workloadId = uniqueName();
      boundWorkloads.push(workloadId);
      const bound = await apiClient.post(workloadPath(workloadId), {
        headers: adminHeaders,
        body: { operation: 'bind', serviceAccountId: id },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
      expect(await runWorkload(apiClient, workloadId)).toHaveStatusCode(200);

      const expectedWorkloads = [
        {
          pluginId: 'serviceAccountsTest',
          workloadType: 'job',
          workloadId,
          displayName: workloadId,
        },
      ];

      const listed = await apiClient.get(`${serviceAccountPath(id)}/workloads`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(listed).toHaveStatusCode(200);
      expect(listed.body).toStrictEqual({ workloads: expectedWorkloads });

      const refused = await apiClient.delete(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(refused).toHaveStatusCode(409);
      expect(refused.body).toMatchObject({
        message: `Service account [${id}] is still bound to 1 workload. Unbind them first.`,
        attributes: { workloads: expectedWorkloads },
      });

      const stillThere = await apiClient.get(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(stillThere).toHaveStatusCode(200);

      const forced = await apiClient.delete(`${serviceAccountPath(id)}?force=true`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(forced).toHaveStatusCode(200);
      expect(forced.body).toStrictEqual({ warnings: [] });

      const gone = await apiClient.get(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(gone).toHaveStatusCode(404);

      // The binding outlives a forced delete, but UIAM refuses to exchange a revoked account.
      expect(await runWorkload(apiClient, workloadId)).toHaveStatusCode(500);
    }
  );

  apiTest('answers 404 for an account that does not exist', async ({ apiClient }) => {
    // Shaped like a real UIAM id: 16 random bytes, base64url-encoded.
    const response = await apiClient.delete(
      serviceAccountPath(randomBytes(16).toString('base64url')),
      { headers: adminHeaders, responseType: 'json' }
    );
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'refuses a caller without `manage_security`, and leaves the account in place',
    async ({ apiClient, samlAuth, uiamServiceAccounts }) => {
      const { id } = await uiamServiceAccounts.create({ name: uniqueName(), roles: ['viewer'] });
      const viewerHeaders = {
        ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
        ...HEADERS,
      };

      const refused = await apiClient.delete(serviceAccountPath(id), {
        headers: viewerHeaders,
        responseType: 'json',
      });
      expect(refused).toHaveStatusCode(403);

      const workloads = await apiClient.get(`${serviceAccountPath(id)}/workloads`, {
        headers: viewerHeaders,
        responseType: 'json',
      });
      expect(workloads).toHaveStatusCode(403);

      const stillThere = await apiClient.get(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(stillThere).toHaveStatusCode(200);
    }
  );

  apiTest(
    'refuses a credential UIAM did not issue, and leaves the account in place',
    async ({ apiClient, esClient, uiamServiceAccounts }) => {
      const { id } = await uiamServiceAccounts.create({ name: uniqueName(), roles: ['viewer'] });
      // An Elasticsearch API key with its owner's privileges, so the privilege check passes.
      const apiKey = await esClient.security.createApiKey({ name: uniqueName() });
      apiKeyIds.push(apiKey.id);

      const refused = await apiClient.delete(serviceAccountPath(id), {
        headers: { ...HEADERS, Authorization: `ApiKey ${apiKey.encoded}` },
        responseType: 'json',
      });
      expect(refused).toHaveStatusCode(400);
      expect(refused.body).toMatchObject({
        message: 'Provided credential is not compatible with UIAM',
      });

      const stillThere = await apiClient.get(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(stillThere).toHaveStatusCode(200);
    }
  );

  apiTest(
    'refuses a service account caller, and leaves the account in place',
    async ({ apiClient, uiamServiceAccounts }) => {
      const { id } = await uiamServiceAccounts.create({ name: uniqueName(), roles: ['viewer'] });
      // `admin` holds `manage_security`, so the privilege check passes.
      const caller = await uiamServiceAccounts.create({ name: uniqueName(), roles: ['admin'] });
      const token = await exchangeUiamServiceAccountToken(caller.id);

      const refused = await apiClient.delete(serviceAccountPath(id), {
        headers: tokenHeaders(token),
        responseType: 'json',
      });
      expect(refused).toHaveStatusCode(400);
      expect(refused.body).toMatchObject({
        message:
          'Cannot delete a service account: a service account cannot delete service accounts. ' +
          'Make the request from a user session',
      });

      const stillThere = await apiClient.get(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(stillThere).toHaveStatusCode(200);
    }
  );

  apiTest(
    'leaves a token issued before the delete valid until it expires',
    async ({ apiClient, uiamServiceAccounts }) => {
      apiTest.setTimeout(OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS);
      const { id } = await uiamServiceAccounts.create({ name: uniqueName(), roles: ['viewer'] });
      const issuedAt = Date.now();
      const token = await exchangeUiamServiceAccountToken(id);
      const authenticate = () =>
        apiClient.get(PRINCIPAL_PATH, { headers: tokenHeaders(token), responseType: 'json' });
      expect(await authenticate()).toHaveStatusCode(200);

      const deleted = await apiClient.delete(serviceAccountPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(deleted).toHaveStatusCode(200);

      // Revoking the account stops new exchanges, not the tokens UIAM already issued.
      const afterDelete = await authenticate();
      expect(afterDelete).toHaveStatusCode(200);
      expect(afterDelete.body).toStrictEqual({
        principal: { type: 'service_account', variant: 'uiam', serviceAccountId: id },
      });

      await setTimeout(Math.max(0, OUTLIVE_UIAM_TOKEN_MS - (Date.now() - issuedAt)));
      expect(await authenticate()).toHaveStatusCode(401);
    }
  );
});
