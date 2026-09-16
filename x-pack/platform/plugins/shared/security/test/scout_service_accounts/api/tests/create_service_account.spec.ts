/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const CREATE_ENDPOINT = 'internal/security/service_account';
const NAMESPACE = 'kibana';

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

apiTest.describe('Create Elasticsearch service accounts', { tag: tags.stateful.classic }, () => {
  const created: string[] = [];

  apiTest.afterAll(async ({ esClient, log }) => {
    for (const name of created) {
      try {
        // `force`, since the account still holds the token Kibana minted for it.
        await esClient.transport.request({
          method: 'DELETE',
          path: `/_security/service/${NAMESPACE}/${name}`,
          querystring: { force: 'true' },
        });
      } catch (err) {
        log.warning(`Failed to clean up service account [${NAMESPACE}/${name}]: ${err.message}`);
      }
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
      expect(Object.keys(credentials.tokens)).toContain('kibana-managed');
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

      const response = await apiClient.post(CREATE_ENDPOINT, {
        headers: { ...cookieHeader, 'kbn-xsrf': 'true' },
        responseType: 'json',
        body: { name: '../_cluster/settings' },
      });

      // Rejected by Kibana's own validation, before anything reaches Elasticsearch.
      expect(response.statusCode).toBe(400);
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
