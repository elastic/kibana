/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
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

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
/**
 * The endpoints are `access: 'internal'`, and Scout's `apiClient` adds no headers of its own. The
 * origin header is what a real internal caller sends, and what keeps the suite passing should the
 * server config ever stop disabling `server.restrictInternalApis`.
 */
const REQUEST_HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
/** A namespace Kibana never writes to, for accounts created straight through Elasticsearch. */
const FOREIGN_NAMESPACE = 'scout';
/**
 * Upper bound on the directory walk below. The route caps a page at 100, so this covers a cluster
 * holding 5,000 user-managed accounts. It exists to stop a runaway loop, not to bound the walk:
 * reaching it is a failure, not a quiet end.
 */
const MAX_PAGES = 50;

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const getPath = (id: string) => `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;

interface DirectoryCreator {
  type: string;
  username?: string;
  displayName?: string;
}

interface DirectoryEntry {
  id: string;
  name: string;
  roles: string[];
  enabled: boolean;
  hasCredential: boolean;
  createdBy?: DirectoryCreator;
  createdAt?: string;
}

interface ListResponse {
  serviceAccounts: DirectoryEntry[];
  nextPage?: string;
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
    // The username identifies the creator durably; the display name is what to show. Both are
    // asserted, so dropping either one fails here.
    expect(typeof createdBy?.username).toBe('string');
    expect(createdBy?.username).not.toBe('');
    // The SAML admin has a user profile, so Kibana resolves the creator's name server-side
    // rather than handing the UI an id to look up.
    expect(typeof createdBy?.displayName).toBe('string');
    expect(typeof createdAt).toBe('string');
  };

  apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...cookieHeader, ...REQUEST_HEADERS };

    kibanaManaged = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: uniqueName('directory') };
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

  /**
   * Walks the directory to its end, following the cursor.
   *
   * The accounts are cluster-wide and sorted by principal, and this suite's own fixtures sort
   * late: `scout/...` follows every `kibana/...` account, so anything already on the cluster
   * pushes them further back. A single page therefore proves nothing about whether they are
   * listed, and a walk that silently gave up at a page cap would report their absence as a
   * missing account rather than as an incomplete read. Hence the throw.
   */
  const listAllServiceAccounts = async (
    apiClient: ApiClientFixture,
    headers: Record<string, string>
  ): Promise<DirectoryEntry[]> => {
    const accounts: DirectoryEntry[] = [];
    let after: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const query = after === undefined ? '' : `?after=${encodeURIComponent(after)}`;
      const response = await apiClient.get(`${SERVICE_ACCOUNT_ENDPOINT}${query}`, {
        headers,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      const { serviceAccounts, nextPage } = response.body as ListResponse;
      accounts.push(...serviceAccounts);

      if (nextPage === undefined) {
        return accounts;
      }
      after = nextPage;
    }

    throw new Error(
      `The service account directory did not end within ${MAX_PAGES} pages. Either the cluster ` +
        `holds more accounts than this suite anticipates, or paging is not terminating.`
    );
  };

  apiTest(
    'lists every user-managed account, whichever namespace it lives in',
    async ({ apiClient }) => {
      const accounts = await listAllServiceAccounts(apiClient, adminHeaders);

      expectKibanaManagedEntry(accounts.find(({ id }) => id === idOf(kibanaManaged)));

      // Kibana can describe an account it did not create, but holds no credential of its own for
      // it: `hasCredential` is how the UI tells the two apart.
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
    const accounts = await listAllServiceAccounts(apiClient, adminHeaders);
    const ids = accounts.map(({ id }) => id);

    // What paging has to guarantee: every account exactly once, in principal order, with no
    // entry dropped or repeated across a page boundary.
    expect([...ids].sort()).toStrictEqual(ids);
    expect(ids.filter((id) => id === idOf(kibanaManaged))).toHaveLength(1);
    expect(ids.filter((id) => id === idOf(foreign))).toHaveLength(1);

    // Resuming is then checked against a known neighbour rather than by walking the whole
    // directory one entry at a time, so the assertion does not depend on how many accounts the
    // cluster happens to hold.
    const index = ids.indexOf(idOf(kibanaManaged));
    const query = index === 0 ? '?limit=1' : `?limit=1&after=${encodeURIComponent(ids[index - 1])}`;
    const response = await apiClient.get(`${SERVICE_ACCOUNT_ENDPOINT}${query}`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
    const { serviceAccounts, nextPage } = response.body as ListResponse;
    expect(serviceAccounts.map(({ id }) => id)).toStrictEqual([idOf(kibanaManaged)]);
    // `scout/...` sorts after every `kibana/...` account, so the foreign fixture always follows
    // this one and there is always another page.
    expect(nextPage).toBe(idOf(kibanaManaged));
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

  apiTest(
    'stops claiming a credential once the account is recreated outside Kibana',
    async ({ apiClient, esClient }) => {
      const recreated = {
        namespace: ES_SERVICE_ACCOUNT_NAMESPACE,
        name: uniqueName('recreated'),
      };
      created.push(recreated);

      const createResponse = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        responseType: 'json',
        body: { name: recreated.name, roles: ['viewer'] },
      });
      expect(createResponse.statusCode).toBe(200);

      const before = await apiClient.get(getPath(idOf(recreated)), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect((before.body as DirectoryEntry).hasCredential).toBe(true);

      // Out of band, and supported. The token goes first: Elasticsearch refuses to recreate an
      // account that still has one, even after a forced delete of the account itself. Kibana's
      // credential document is keyed by principal alone, so it survives all of this.
      await esClient.transport.request({
        method: 'DELETE',
        path:
          `/_security/service/${recreated.namespace}/${recreated.name}` +
          `/credential/token/${ES_SERVICE_ACCOUNT_TOKEN_NAME}`,
      });
      await esClient.transport.request({
        method: 'DELETE',
        path: `/_security/service/${recreated.namespace}/${recreated.name}`,
        querystring: { force: 'true' },
      });
      await esClient.transport.request({
        method: 'PUT',
        path: `/_security/service/${recreated.namespace}/${recreated.name}`,
        body: { roles: ['monitoring_user'] },
        querystring: { refresh: 'wait_for' },
      });

      const after = await apiClient.get(getPath(idOf(recreated)), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(after.statusCode).toBe(200);
      // The stored token cannot authenticate this account, and whoever created the one it
      // replaced did not create it, so neither is reported.
      expect(after.body).toStrictEqual({
        id: idOf(recreated),
        name: recreated.name,
        roles: ['monitoring_user'],
        enabled: true,
        hasCredential: false,
      });
    }
  );

  apiTest('answers 404 for an unknown account and for a built-in one', async ({ apiClient }) => {
    for (const id of [
      `${ES_SERVICE_ACCOUNT_NAMESPACE}/${uniqueName('missing')}`,
      'elastic/kibana',
    ]) {
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

  // Stateful only: the `after` case is the Elasticsearch backend refusing a cursor it could not
  // have issued. UIAM validates its own cursors and answers a bad one itself, so this assertion
  // does not carry over to a serverless deployment.
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
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });
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
