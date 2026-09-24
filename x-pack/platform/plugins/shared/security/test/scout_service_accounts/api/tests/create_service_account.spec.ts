/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ES_SERVICE_ACCOUNT_NAMESPACE,
  ES_SERVICE_ACCOUNT_TOKEN_NAME,
} from '../../../../common/service_accounts';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';

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

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

apiTest.describe('Create Elasticsearch service accounts', { tag: LOCAL_ONLY }, () => {
  const created: ServiceAccountPrincipal[] = [];

  apiTest.afterAll(async ({ esClient, config }) => {
    await deleteServiceAccounts(esClient, config, created);
  });

  apiTest(
    'creates the account, mints its token, and reports only the id and name',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const name = uniqueName('relay');
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name },
      });

      expect(response.statusCode).toBe(200);
      // The long-lived credential never leaves the security plugin.
      expect(response.body).toStrictEqual({ id: `${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`, name });

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`,
      });
      expect(account[`${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`]).toMatchObject({
        type: 'user_managed',
        enabled: true,
      });

      const credentials = await esClient.transport.request<{ tokens: Record<string, unknown> }>({
        method: 'GET',
        path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}/credential`,
      });
      expect(Object.keys(credentials.tokens)).toContain(ES_SERVICE_ACCOUNT_TOKEN_NAME);
    }
  );

  apiTest('assigns the roles the caller asked for', async ({ apiClient, esClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const name = uniqueName('scoped');
    created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });

    const response = await apiClient.post(CREATE_ENDPOINT, {
      headers: { ...cookieHeader, ...REQUEST_HEADERS },
      responseType: 'json',
      body: { name, roles: ['viewer'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({ id: `${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`, name });

    const account = await esClient.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`,
    });
    expect(account[`${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`]).toMatchObject({ roles: ['viewer'] });
  });

  apiTest('refuses a name that is already taken', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const name = uniqueName('duplicate');
    created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });
    const headers = { ...cookieHeader, ...REQUEST_HEADERS };

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
          headers: { ...cookieHeader, ...REQUEST_HEADERS },
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
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name },
      });

      expect(response.statusCode).toBe(200);

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`,
      });
      expect(account[`${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`]).toMatchObject({
        roles: ['superuser'],
      });
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
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...apiKeyHeader, ...REQUEST_HEADERS },
        responseType: 'json',
        body: { name, roles: ['viewer'] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({ id: `${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`, name });

      const account = await esClient.transport.request<Record<string, unknown>>({
        method: 'GET',
        path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`,
      });
      // Exactly what was asked for. The key is owned by an admin, so anything wider here would
      // mean Kibana fell back to the owner's privileges.
      expect(account[`${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`]).toMatchObject({
        roles: ['viewer'],
      });
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
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });

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
    created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });

    const response = await apiClient.post(CREATE_ENDPOINT, {
      headers: { ...cookieHeader, ...REQUEST_HEADERS },
      responseType: 'json',
      body: { name },
    });

    expect(response.statusCode).toBe(403);
  });
});
