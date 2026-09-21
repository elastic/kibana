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

/**
 * Local only: this suite needs the `service_accounts` custom server config set, and custom config
 * sets are not available on Elastic Cloud.
 */
const LOCAL_ONLY = ['@local-stateful-classic'];

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
/**
 * The endpoints are `access: 'internal'`, and Scout's `apiClient` adds no headers of its own. The
 * origin header is what a real internal caller sends, and what keeps the suite passing should the
 * server config ever stop disabling `server.restrictInternalApis`.
 */
const REQUEST_HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
/** The namespace Kibana creates accounts under, `ES_SERVICE_ACCOUNT_NAMESPACE`. */
const KIBANA_NAMESPACE = 'kibana';
/** A namespace Kibana never writes to, for accounts created straight through Elasticsearch. */
const FOREIGN_NAMESPACE = 'scout';
/** Enough pages to walk every account a shared cluster could plausibly hold, and no more. */
const MAX_PAGES = 200;

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const getPath = (id: string) => `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;

interface DirectoryEntry {
  id: string;
  name: string;
  roles: string[];
  enabled: boolean;
  hasCredential: boolean;
  createdBy?: unknown;
  createdAt?: string;
}

interface ListResponse {
  service_accounts: DirectoryEntry[];
  next_page?: string;
}

apiTest.describe('List and get Elasticsearch service accounts', { tag: LOCAL_ONLY }, () => {
  const created: ServiceAccountPrincipal[] = [];

  let adminHeaders: Record<string, string>;
  /** Created through Kibana, so Kibana holds a credential for it. */
  let kibanaManaged: ServiceAccountPrincipal;
  /** Created straight through Elasticsearch, so Kibana holds nothing for it. */
  let foreign: ServiceAccountPrincipal;

  const idOf = ({ namespace, name }: ServiceAccountPrincipal) => `${namespace}/${name}`;

  /**
   * The account created through Kibana in `beforeAll`, as the directory reports it. The creator
   * and the timestamp are checked by shape only: the SAML admin's username and the clock are the
   * test environment's, not this suite's.
   */
  const expectKibanaManagedEntry = (entry: DirectoryEntry | undefined) => {
    expect(entry).toBeDefined();
    const { createdBy, createdAt, ...rest } = entry as DirectoryEntry;
    expect(rest).toStrictEqual({
      id: idOf(kibanaManaged),
      name: kibanaManaged.name,
      roles: ['viewer'],
      enabled: true,
      hasCredential: true,
    });
    expect(createdBy).toMatchObject({ type: 'user' });
    expect(typeof createdAt).toBe('string');
  };

  apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...cookieHeader, ...REQUEST_HEADERS };

    kibanaManaged = { namespace: KIBANA_NAMESPACE, name: uniqueName('directory') };
    created.push(kibanaManaged);
    const response = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
      headers: adminHeaders,
      responseType: 'json',
      body: { name: kibanaManaged.name, roles: ['viewer'] },
    });
    expect(response.statusCode).toBe(200);

    foreign = { namespace: FOREIGN_NAMESPACE, name: uniqueName('foreign') };
    created.push(foreign);
    await esClient.transport.request({
      method: 'PUT',
      path: `/_security/service/${foreign.namespace}/${foreign.name}`,
      body: { roles: ['monitoring_user'], enabled: false },
      querystring: { refresh: 'wait_for' },
    });
  });

  apiTest.afterAll(async ({ esClient, config }) => {
    await deleteServiceAccounts(esClient, config, created);
  });

  apiTest(
    'lists every user-managed account, whichever namespace it lives in',
    async ({ apiClient }) => {
      const response = await apiClient.get(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      const { service_accounts: accounts } = response.body as ListResponse;

      const managed = accounts.find(({ id }) => id === idOf(kibanaManaged));
      expectKibanaManagedEntry(managed);

      // Kibana can describe an account it did not create, but cannot bind it: `hasCredential` is
      // how the UI tells the two apart.
      const notManaged = accounts.find(({ id }) => id === idOf(foreign));
      expect(notManaged).toStrictEqual({
        id: idOf(foreign),
        name: foreign.name,
        roles: ['monitoring_user'],
        enabled: false,
        hasCredential: false,
      });

      // Built-in accounts are Elasticsearch's own and never appear in the directory.
      expect(accounts.map(({ id }) => id)).not.toContain('elastic/kibana');
    }
  );

  apiTest('pages through the directory with `limit` and `after`', async ({ apiClient }) => {
    const seen: string[] = [];
    let after: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const query = after ? `?limit=1&after=${encodeURIComponent(after)}` : '?limit=1';
      const response = await apiClient.get(`${SERVICE_ACCOUNT_ENDPOINT}${query}`, {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      const body = response.body as ListResponse;
      expect(body.service_accounts.length).toBeLessThanOrEqual(1);
      seen.push(...body.service_accounts.map(({ id }) => id));

      if (body.next_page === undefined) {
        break;
      }
      // The cursor is the last principal on the page, and the pages are sorted by principal.
      expect(body.next_page).toBe(body.service_accounts[0].id);
      after = body.next_page;
    }

    expect(seen.filter((id) => id === idOf(kibanaManaged))).toHaveLength(1);
    expect(seen.filter((id) => id === idOf(foreign))).toHaveLength(1);
    expect([...seen].sort()).toStrictEqual(seen);
  });

  apiTest('gets an account by its URL-encoded id', async ({ apiClient }) => {
    const response = await apiClient.get(getPath(idOf(kibanaManaged)), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
    expectKibanaManagedEntry(response.body as DirectoryEntry);
  });

  apiTest('gets an account Kibana holds no credential for', async ({ apiClient }) => {
    const response = await apiClient.get(getPath(idOf(foreign)), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({
      id: idOf(foreign),
      name: foreign.name,
      roles: ['monitoring_user'],
      enabled: false,
      hasCredential: false,
    });
  });

  apiTest('answers 404 for an unknown account and for a built-in one', async ({ apiClient }) => {
    for (const id of [`${KIBANA_NAMESPACE}/${uniqueName('missing')}`, 'elastic/kibana']) {
      const response = await apiClient.get(getPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response.statusCode, `id [${id}] should be a 404`).toBe(404);
    }
  });

  apiTest('rejects an id that is not a service account principal', async ({ apiClient }) => {
    for (const id of ['no-namespace', 'kibana/../_cluster/settings', 'a/b/c']) {
      const response = await apiClient.get(getPath(id), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response.statusCode, `id [${id}] should be a 400`).toBe(400);
    }
  });

  apiTest('rejects a page size outside 1 to 100 and a foreign cursor', async ({ apiClient }) => {
    for (const query of ['?limit=0', '?limit=101', '?after=not-a-principal']) {
      const response = await apiClient.get(`${SERVICE_ACCOUNT_ENDPOINT}${query}`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response.statusCode, `query [${query}] should be a 400`).toBe(400);
    }
  });

  apiTest(
    'allows a caller with `read_security` to read but not to create',
    async ({ apiClient, requestAuth }) => {
      // Kibana access is granted, so any refusal below is attributable to the cluster privilege
      // rather than to the key having no Kibana access.
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        elasticsearch: { cluster: ['read_security'] },
      });
      const headers = { ...apiKeyHeader, ...REQUEST_HEADERS };

      const list = await apiClient.get(SERVICE_ACCOUNT_ENDPOINT, { headers, responseType: 'json' });
      expect(list.statusCode).toBe(200);

      const get = await apiClient.get(getPath(idOf(kibanaManaged)), {
        headers,
        responseType: 'json',
      });
      expect(get.statusCode).toBe(200);

      // Registered up front even though the request is expected to fail: if the authorization
      // check ever regresses, the account it creates has to be cleaned up like any other.
      const name = uniqueName('read-only');
      created.push({ namespace: KIBANA_NAMESPACE, name });
      const create = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers,
        responseType: 'json',
        body: { name, roles: ['viewer'] },
      });
      expect(create.statusCode).toBe(403);
    }
  );

  apiTest('refuses a caller without `read_security`', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...cookieHeader, ...REQUEST_HEADERS };

    const list = await apiClient.get(SERVICE_ACCOUNT_ENDPOINT, { headers, responseType: 'json' });
    expect(list.statusCode).toBe(403);

    const get = await apiClient.get(getPath(idOf(kibanaManaged)), {
      headers,
      responseType: 'json',
    });
    expect(get.statusCode).toBe(403);
  });
});
