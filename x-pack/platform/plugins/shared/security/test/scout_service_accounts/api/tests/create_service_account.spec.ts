/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  createSystemIndicesEsClient,
  SYSTEM_INDICES_HEADERS,
} from '../fixtures/system_indices_es_client';

/**
 * Local only: this suite needs the `service_accounts` custom server config set, and custom config
 * sets are not available on Elastic Cloud.
 */
const LOCAL_ONLY = ['@local-stateful-classic'];

const CREATE_ENDPOINT = 'internal/security/service_account';
/**
 * The endpoint is `access: 'internal'`, and Scout's `apiClient` adds no headers of its own. The
 * origin header is what a real internal caller sends, and what keeps the suite passing should the
 * server config ever stop disabling `server.restrictInternalApis`.
 */
const REQUEST_HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const NAMESPACE = 'kibana';
/** The single token Kibana mints per account, named in `ES_SERVICE_ACCOUNT_TOKEN_NAME`. */
const TOKEN_NAME = 'kibana-managed';
const CREDENTIAL_TYPE = 'service-account-credential';
/** Alias of the main saved objects index, which the credential type lands in. */
const KIBANA_INDEX = '.kibana';
/** Raw field path of an attribute on a saved object document, which nests them under the type. */
const CREDENTIAL_ACCOUNT_FIELD = `${CREDENTIAL_TYPE}.serviceAccountId`;

/**
 * How many roles Elasticsearch allows on a user-managed service account, and so the most Kibana
 * sends to it: `ES_SERVICE_ACCOUNT_MAX_ROLES`. UIAM's cap is far lower, so this also shows that
 * the UIAM limit does not leak into this backend.
 */
const ES_MAX_ROLES = 1000;

/**
 * The longest role name Elasticsearch accepts on a user-managed service account, and so the
 * longest Kibana sends to it: `ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH`. Elasticsearch has a
 * larger general limit that this API does not use, so only a real cluster shows which one applies.
 */
const ES_MAX_ROLE_NAME_LENGTH = 507;

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** A sorted copy, for comparing role lists whose order Elasticsearch does not preserve. */
const sorted = (values: string[]) => [...values].sort();

/** Distinct role names, since Kibana drops duplicates before it counts. */
const distinctRoles = (count: number) => Array.from({ length: count }, (_, i) => `role-${i}`);

apiTest.describe('Create Elasticsearch service accounts', { tag: LOCAL_ONLY }, () => {
  const created: string[] = [];

  apiTest.afterAll(async ({ esClient, config }) => {
    const failures: string[] = [];

    for (const name of created) {
      // Token first, then the account, the same order `EsServiceAccounts.rollback` uses: a forced
      // account delete can leave the token behind, and a lingering token blocks recreating the
      // name on the next run. A 404 is the expected answer for a name a failing test registered
      // but never got created.
      try {
        await esClient.transport.request(
          {
            method: 'DELETE',
            path: `/_security/service/${NAMESPACE}/${name}/credential/token/${TOKEN_NAME}`,
          },
          { ignore: [404] }
        );
      } catch (err) {
        failures.push(`service account token [${NAMESPACE}/${name}/${TOKEN_NAME}]: ${err.message}`);
      }

      try {
        // `force`, in case the token delete above did not land: Elasticsearch refuses an unforced
        // delete while any token remains.
        await esClient.transport.request(
          {
            method: 'DELETE',
            path: `/_security/service/${NAMESPACE}/${name}`,
            querystring: { force: 'true' },
          },
          { ignore: [404] }
        );
      } catch (err) {
        failures.push(`service account [${NAMESPACE}/${name}]: ${err.message}`);
      }
    }

    // Every successful create also writes an encrypted credential saved object, and there is no
    // API to remove one yet, so it is deleted straight out of the index. The type registers no
    // `indexPattern`, which puts it in the main saved objects index, and `serviceAccountId` is
    // mapped as a keyword. Matching on that rather than re-deriving the hashed document ID keeps
    // this working if the derivation ever changes.
    //
    // `.kibana` is restricted, and the plain `esClient` authenticates as `elastic`, whose
    // `superuser` role does not reach restricted indices. The `allow_restricted_indices` role
    // behind the client below, plus the product-origin header, is what makes the delete land.
    if (created.length > 0) {
      let systemIndicesEsClient: Client | undefined;

      try {
        systemIndicesEsClient = await createSystemIndicesEsClient(esClient, config);

        const result = await systemIndicesEsClient.deleteByQuery(
          {
            index: KIBANA_INDEX,
            refresh: true,
            conflicts: 'proceed',
            query: {
              bool: {
                filter: [
                  { term: { type: CREDENTIAL_TYPE } },
                  {
                    terms: {
                      [CREDENTIAL_ACCOUNT_FIELD]: created.map((name) => `${NAMESPACE}/${name}`),
                    },
                  },
                ],
              },
            },
          },
          { headers: SYSTEM_INDICES_HEADERS }
        );

        // A partial delete still resolves, so shard-level failures only surface here. The
        // `deleted` count is not worth asserting on: the tests that expect a 400 or a 403
        // register a name that never gets a credential saved object written for it.
        if (result.failures?.length) {
          failures.push(`credential saved objects: ${JSON.stringify(result.failures)}`);
        }
      } catch (err) {
        failures.push(`credential saved objects: ${err.message}`);
      } finally {
        await systemIndicesEsClient?.close();
      }
    }

    // Thrown rather than warned: these accounts are cluster-scoped and each holds a live
    // credential, so a leak has to fail the suite instead of scrolling past in the log.
    if (failures.length > 0) {
      throw new Error(`Failed to clean up after the suite:\n${failures.join('\n')}`);
    }
  });

  apiTest(
    'creates the account with the requested roles, mints its token, and reports the id, name and roles',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const name = uniqueName('relay');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles: ['viewer', 'editor'] },
      });

      expect(response.statusCode).toBe(200);
      // The long-lived credential never leaves the security plugin.
      expect(response.body).toStrictEqual({
        id: `${NAMESPACE}/${name}`,
        name,
        roles: ['viewer', 'editor'],
      });

      const account = await esClient.transport.request<Record<string, { roles: string[] }>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      const { roles, ...rest } = account[`${NAMESPACE}/${name}`];
      expect(rest).toMatchObject({ type: 'user_managed', enabled: true });
      // Elasticsearch does not keep the roles in the order they were sent.
      expect(sorted(roles)).toStrictEqual(['editor', 'viewer']);

      const credentials = await esClient.transport.request<{ tokens: Record<string, unknown> }>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}/credential`,
      });
      expect(Object.keys(credentials.tokens)).toContain(TOKEN_NAME);
    }
  );

  // Every account is created with explicit roles. There is no "same as me" default: copying the
  // creator's roles is the borrowed identity that service accounts exist to replace.
  apiTest('refuses a request that names no roles', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const name = uniqueName('no-roles');
    created.push(name);
    const headers = { ...cookieHeader, ...REQUEST_HEADERS };

    for (const body of [{ name }, { name, roles: [] }]) {
      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers,
        responseType: 'json',
        body,
      });

      expect(response.statusCode, `${JSON.stringify(body)} should be rejected`).toBe(400);
    }
  });

  apiTest(
    `creates an account with ${ES_MAX_ROLES} roles, the most Elasticsearch allows`,
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const name = uniqueName('max-roles');
      created.push(name);
      const roles = distinctRoles(ES_MAX_ROLES);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({ id: `${NAMESPACE}/${name}`, name, roles });

      // Elasticsearch itself has to accept that many, not just Kibana's validation.
      const account = await esClient.transport.request<Record<string, { roles: string[] }>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      expect(sorted(account[`${NAMESPACE}/${name}`].roles)).toStrictEqual(sorted(roles));
    }
  );

  apiTest(
    `refuses more than ${ES_MAX_ROLES} roles without writing anything`,
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      // Registered up front even though the request is expected to fail: if the limit ever
      // regresses, the account it creates has to be cleaned up like any other.
      const name = uniqueName('too-many-roles');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles: distinctRoles(ES_MAX_ROLES + 1) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('roles');

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      expect(account).toStrictEqual({});
    }
  );

  apiTest(
    `creates an account with a ${ES_MAX_ROLE_NAME_LENGTH}-character role name, the longest Elasticsearch allows`,
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const name = uniqueName('max-role-name');
      created.push(name);
      const roles = ['a'.repeat(ES_MAX_ROLE_NAME_LENGTH)];

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles },
      });

      expect(response.statusCode).toBe(200);

      const account = await esClient.transport.request<Record<string, { roles: string[] }>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      expect(account[`${NAMESPACE}/${name}`].roles).toStrictEqual(roles);
    }
  );

  apiTest(
    `refuses a role name longer than ${ES_MAX_ROLE_NAME_LENGTH} characters without writing anything`,
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      // Registered up front even though the request is expected to fail: if the limit ever
      // regresses, the account it creates has to be cleaned up like any other.
      const name = uniqueName('long-role-name');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles: ['a'.repeat(ES_MAX_ROLE_NAME_LENGTH + 1)] },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('roles');

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      expect(account).toStrictEqual({});
    }
  );

  apiTest('refuses a name that is already taken', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const name = uniqueName('duplicate');
    created.push(name);
    const headers = { ...cookieHeader, ...REQUEST_HEADERS };

    const first = await apiClient.post(CREATE_ENDPOINT, {
      headers,
      responseType: 'json',
      body: { name, roles: ['viewer'] },
    });
    expect(first.statusCode).toBe(200);

    // Elasticsearch's PUT would silently replace the account's roles, so Kibana refuses first.
    const second = await apiClient.post(CREATE_ENDPOINT, {
      headers,
      responseType: 'json',
      body: { name, roles: ['editor'] },
    });
    expect(second.statusCode).toBe(409);
  });

  apiTest(
    'rejects a name that could escape the Elasticsearch path',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      // All three fail on the same rule: `SERVICE_ACCOUNT_NAME_REGEX` rejects `/` outright, so a
      // bare separator and a name pointing at another namespace are refused alongside traversal.
      for (const name of ['../_cluster/settings', 'elastic/', '/']) {
        const response = await apiClient.post(CREATE_ENDPOINT, {
          headers: { ...cookieHeader, ...REQUEST_HEADERS },
          responseType: 'json',
          body: { name, roles: ['viewer'] },
        });

        // Rejected by Kibana's own validation, before anything reaches Elasticsearch.
        expect(response.statusCode, `name [${name}] should be rejected`).toBe(400);
      }
    }
  );

  // Elasticsearch reports no roles at all for an API-key authentication, whatever the key can
  // actually do, which is one more reason the account's roles come from the request alone.
  //
  // Note the key also has to carry Kibana access: Kibana's privilege check always demands its
  // login action alongside the cluster privilege, so a key scoped to Elasticsearch alone is
  // refused before `manage_security` is even considered.
  apiTest(
    'API-key caller: creates the account with the requested roles',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        elasticsearch: { cluster: ['manage_security'] },
      });
      const name = uniqueName('from-api-key-scoped');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles: ['viewer'] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        id: `${NAMESPACE}/${name}`,
        name,
        roles: ['viewer'],
      });

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      // Exactly what was asked for. The key is owned by an admin, so anything wider here would
      // mean Kibana fell back to the owner's privileges.
      expect(account[`${NAMESPACE}/${name}`]).toMatchObject({ roles: ['viewer'] });
    }
  );

  apiTest(
    'API-key caller: refuses a key without `manage_security`',
    async ({ apiClient, requestAuth }) => {
      // Kibana access is granted, so the refusal below is attributable to the missing
      // `manage_security` cluster privilege rather than to the key having no Kibana access.
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        elasticsearch: { cluster: ['read_security'] },
      });

      // Registered up front even though the request is expected to fail: if the authorization
      // check ever regresses, the account it creates has to be cleaned up like any other.
      const name = uniqueName('unauthorized-key');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles: ['viewer'] },
      });

      expect(response.statusCode).toBe(403);
    }
  );

  apiTest('refuses a caller without `manage_security`', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const name = uniqueName('unauthorized');
    created.push(name);

    const response = await apiClient.post(CREATE_ENDPOINT, {
      headers: { ...cookieHeader, ...REQUEST_HEADERS },
      responseType: 'json',
      body: { name, roles: ['viewer'] },
    });

    expect(response.statusCode).toBe(403);
  });
});
