/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

/**
 * Local only: this suite needs the `service_accounts` custom server config set, and custom config
 * sets are not available on Elastic Cloud.
 */
const LOCAL_ONLY = ['@local-stateful-classic'];

const CREATE_ENDPOINT = 'internal/security/service_account';
const NAMESPACE = 'kibana';
/** The single token Kibana mints per account, named in `ES_SERVICE_ACCOUNT_TOKEN_NAME`. */
const TOKEN_NAME = 'kibana-managed';
const CREDENTIAL_TYPE = 'service-account-credential';
/** Raw field path of an attribute on a saved object document, which nests them under the type. */
const CREDENTIAL_ACCOUNT_FIELD = `${CREDENTIAL_TYPE}.serviceAccountId`;

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

apiTest.describe('Create Elasticsearch service accounts', { tag: LOCAL_ONLY }, () => {
  const created: string[] = [];

  apiTest.afterAll(async ({ esClient }) => {
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
    if (created.length > 0) {
      try {
        await esClient.deleteByQuery({
          index: '.kibana',
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
        });
      } catch (err) {
        failures.push(`credential saved objects: ${err.message}`);
      }
    }

    // Thrown rather than warned: these accounts are cluster-scoped and several of them hold
    // `superuser`, so a leak has to fail the suite instead of scrolling past in the log.
    if (failures.length > 0) {
      throw new Error(`Failed to clean up after the suite:\n${failures.join('\n')}`);
    }
  });

  apiTest(
    'creates the account, mints its token, and reports only the id and name',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const name = uniqueName('relay');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, 'kbn-xsrf': 'true' },
        responseType: 'json',
        body: { name },
      });

      expect(response.statusCode).toBe(200);
      // The long-lived credential never leaves the security plugin.
      expect(response.body).toStrictEqual({ id: `${NAMESPACE}/${name}`, name });

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      expect(account[`${NAMESPACE}/${name}`]).toMatchObject({
        type: 'user_managed',
        enabled: true,
      });

      const credentials = await esClient.transport.request<{ tokens: Record<string, unknown> }>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}/credential`,
      });
      expect(Object.keys(credentials.tokens)).toContain(TOKEN_NAME);
    }
  );

  apiTest('assigns the roles the caller asked for', async ({ apiClient, esClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const name = uniqueName('scoped');
    created.push(name);

    await apiClient.post(CREATE_ENDPOINT, {
      headers: { ...cookieHeader, 'kbn-xsrf': 'true' },
      responseType: 'json',
      body: { name, roles: ['viewer'] },
    });

    const account = await esClient.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `/_security/service/${NAMESPACE}/${name}`,
    });
    expect(account[`${NAMESPACE}/${name}`]).toMatchObject({ roles: ['viewer'] });
  });

  apiTest('refuses a name that is already taken', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const name = uniqueName('duplicate');
    created.push(name);
    const headers = { ...cookieHeader, 'kbn-xsrf': 'true' };

    const first = await apiClient.post(CREATE_ENDPOINT, {
      headers,
      responseType: 'json',
      body: { name },
    });
    expect(first.statusCode).toBe(200);

    // Elasticsearch's PUT would silently replace the account's roles, so Kibana refuses first.
    const second = await apiClient.post(CREATE_ENDPOINT, {
      headers,
      responseType: 'json',
      body: { name },
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
          headers: { ...cookieHeader, 'kbn-xsrf': 'true' },
          responseType: 'json',
          body: { name },
        });

        // Rejected by Kibana's own validation, before anything reaches Elasticsearch.
        expect(response.statusCode, `name [${name}] should be rejected`).toBe(400);
      }
    }
  );

  // Elasticsearch reports no roles at all for an API-key authentication, whatever the key can
  // actually do, so the creator's roles cannot be copied the way they are for a session user.
  // The key's `limited_by` is no substitute: it names the *owner's* roles regardless of how the
  // key itself is restricted. With nothing to copy the account falls back to `superuser`, which
  // escalates nothing at this gate — `manage_security` already implies full access — but must
  // never be silent.
  //
  // Note the key also has to carry Kibana access: Kibana's privilege check always demands its
  // login action alongside the cluster privilege, so a key scoped to Elasticsearch alone is
  // refused before `manage_security` is even considered.
  apiTest(
    'API-key caller: falls back to `superuser` when the roles cannot be derived',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        elasticsearch: { cluster: ['manage_security'] },
      });
      const name = uniqueName('from-api-key');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, 'kbn-xsrf': 'true' },
        responseType: 'json',
        body: { name },
      });

      expect(response.statusCode).toBe(200);

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${NAMESPACE}/${name}`,
      });
      expect(account[`${NAMESPACE}/${name}`]).toMatchObject({ roles: ['superuser'] });
    }
  );

  apiTest(
    'API-key caller: creates the account when the roles are named explicitly',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        elasticsearch: { cluster: ['manage_security'] },
      });
      const name = uniqueName('from-api-key-scoped');
      created.push(name);

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, 'kbn-xsrf': 'true' },
        responseType: 'json',
        body: { name, roles: ['viewer'] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({ id: `${NAMESPACE}/${name}`, name });

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

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, 'kbn-xsrf': 'true' },
        responseType: 'json',
        body: { name: uniqueName('unauthorized-key'), roles: ['viewer'] },
      });

      expect(response.statusCode).toBe(403);
    }
  );

  apiTest('refuses a caller without `manage_security`', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.post(CREATE_ENDPOINT, {
      headers: { ...cookieHeader, 'kbn-xsrf': 'true' },
      responseType: 'json',
      body: { name: uniqueName('unauthorized') },
    });

    expect(response.statusCode).toBe(403);
  });
});
