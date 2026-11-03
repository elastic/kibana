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
import {
  bindWorkload,
  type TestWorkload,
  unbindWorkloads,
} from '../fixtures/service_account_workloads';

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

/**
 * What this suite expects back. No `createdBy`, which is UIAM-only for now while this suite
 * exercises the Elasticsearch backend, and no creation time, which neither backend reports.
 */
interface DirectoryEntry {
  id: string;
  name: string;
  roles: string[];
  enabled: boolean;
  assumable: boolean;
  description?: string;
  /** Reported by the list only. */
  workloadCount?: number;
}

interface ListResponse {
  serviceAccounts: DirectoryEntry[];
  nextPage?: string;
}

apiTest.describe('List and get Elasticsearch service accounts', { tag: LOCAL_ONLY }, () => {
  const created: ServiceAccountPrincipal[] = [];
  const boundWorkloads: TestWorkload[] = [];
  const createdSpaces: string[] = [];

  let adminHeaders: Record<string, string>;
  /** Created through Kibana, so Kibana holds a token and can assume it. */
  let kibanaManaged: ServiceAccountPrincipal;
  /** Created straight through Elasticsearch, so Kibana holds nothing to assume it with. */
  let foreign: ServiceAccountPrincipal;

  const idOf = ({ namespace, name }: ServiceAccountPrincipal) => `${namespace}/${name}`;

  /**
   * The account created through Kibana in `beforeAll`, as the directory reports it.
   *
   * Asserted whole, which pins the absence of a creator as much as the rest: Elasticsearch does
   * not record who created an account yet, and Kibana deliberately does not answer with the
   * creator of the credential it stored instead. A followup reports both fields once
   * Elasticsearch has them, and this assertion is what will catch that change.
   *
   * Only the list counts the workloads bound to an account, so `listed` adds that count.
   */
  const expectKibanaManagedEntry = (
    entry: DirectoryEntry | undefined,
    { listed }: { listed: boolean }
  ) => {
    expect(entry).toStrictEqual({
      id: idOf(kibanaManaged),
      name: kibanaManaged.name,
      roles: ['viewer'],
      enabled: true,
      assumable: true,
      ...(listed && { workloadCount: 0 }),
    });
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

  apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
    // Every step runs, even when an earlier one fails, so one failure doesn't leave the rest behind.
    const failures: Error[] = [];
    const cleanup = [
      async () => unbindWorkloads(kbnClient, boundWorkloads),
      async () => {
        for (const spaceId of createdSpaces) {
          await kbnClient.spaces.delete(spaceId);
        }
      },
      async () => deleteServiceAccounts(esClient, config, created),
    ];
    for (const remove of cleanup) {
      try {
        await remove();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error('Directory cleanup failed.'));
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, 'Service account directory cleanup failed.');
    }
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

      expectKibanaManagedEntry(
        accounts.find(({ id }) => id === idOf(kibanaManaged)),
        { listed: true }
      );

      // Kibana can describe an account it did not create, but holds no token to act as it with.
      // `assumable` is how the UI tells the two apart.
      const notManaged = accounts.find(({ id }) => id === idOf(foreign));
      expect(notManaged).toStrictEqual({
        id: idOf(foreign),
        name: foreign.name,
        roles: ['monitoring_user'],
        enabled: false,
        assumable: false,
        workloadCount: 0,
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
    expectKibanaManagedEntry(response.body as DirectoryEntry, { listed: false });
  });

  apiTest('gets an account this Kibana cannot assume', async ({ apiClient }) => {
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
      assumable: false,
    });
  });

  apiTest(
    'reports the description of an account, whether Kibana or Elasticsearch wrote it',
    async ({ apiClient, esClient }) => {
      const viaKibana = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: uniqueName('described') };
      created.push(viaKibana);
      const createResponse = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        responseType: 'json',
        body: {
          name: viaKibana.name,
          roles: ['viewer'],
          description: 'Relays the nightshift alerts.',
        },
      });
      expect(createResponse.statusCode).toBe(200);

      const viaElasticsearch = { namespace: FOREIGN_NAMESPACE, name: uniqueName('described') };
      created.push(viaElasticsearch);
      await esClient.transport.request({
        method: 'PUT',
        path: `/_security/service/${viaElasticsearch.namespace}/${viaElasticsearch.name}`,
        body: { roles: ['monitoring_user'], description: 'Written straight to Elasticsearch.' },
        querystring: { refresh: 'wait_for' },
      });

      const expected = [
        [idOf(viaKibana), 'Relays the nightshift alerts.'],
        [idOf(viaElasticsearch), 'Written straight to Elasticsearch.'],
      ] as const;

      for (const [id, description] of expected) {
        const response = await apiClient.get(getPath(id), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response.statusCode).toBe(200);
        expect((response.body as DirectoryEntry).description).toBe(description);
      }

      const accounts = await listAllServiceAccounts(apiClient, adminHeaders);
      for (const [id, description] of expected) {
        expect(accounts.find((account) => account.id === id)?.description).toBe(description);
      }
    }
  );

  apiTest(
    'stops reporting the account assumable once it is recreated outside Kibana',
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
      expect((before.body as DirectoryEntry).assumable).toBe(true);

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
      // The stored token cannot authenticate this account, so Kibana can no longer act as it.
      expect(after.body).toStrictEqual({
        id: idOf(recreated),
        name: recreated.name,
        roles: ['monitoring_user'],
        enabled: true,
        assumable: false,
      });
    }
  );

  apiTest(
    'counts the workloads bound to an account across every space',
    async ({ apiClient, kbnClient }) => {
      const bound = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: uniqueName('bound') };
      created.push(bound);
      const createResponse = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        responseType: 'json',
        body: { name: bound.name, roles: ['viewer'] },
      });
      expect(createResponse.statusCode).toBe(200);

      const spaceId = uniqueName('space');
      createdSpaces.push(spaceId);
      await kbnClient.spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });

      const workloadId = uniqueName('workload');
      for (const workloadSpaceId of [undefined, spaceId]) {
        boundWorkloads.push({ workloadId, spaceId: workloadSpaceId });
        await bindWorkload(kbnClient, workloadId, idOf(bound), workloadSpaceId);
      }

      const accounts = await listAllServiceAccounts(apiClient, adminHeaders);
      expect(accounts.find(({ id }) => id === idOf(bound))?.workloadCount).toBe(2);
      expect(accounts.find(({ id }) => id === idOf(kibanaManaged))?.workloadCount).toBe(0);

      // Get reports one account, and leaves counting to the list.
      const get = await apiClient.get(getPath(idOf(bound)), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(get.statusCode).toBe(200);
      expect((get.body as DirectoryEntry).workloadCount).toBeUndefined();
    }
  );

  apiTest(
    'answers 404 for an unknown account, a built-in one, and an id that is no principal at all',
    async ({ apiClient }) => {
      for (const id of [
        `${ES_SERVICE_ACCOUNT_NAMESPACE}/${uniqueName('missing')}`,
        'elastic/kibana',
        'no-namespace',
        'kibana/../_cluster/settings',
        'a/b/c',
      ]) {
        const response = await apiClient.get(getPath(id), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response.statusCode, `id [${id}] should be a 404`).toBe(404);
      }
    }
  );

  apiTest('rejects a page size outside 1 to 100', async ({ apiClient }) => {
    for (const query of ['?limit=0', '?limit=101']) {
      const response = await apiClient.get(`${SERVICE_ACCOUNT_ENDPOINT}${query}`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response.statusCode, `query [${query}] should be a 400`).toBe(400);
    }
  });

  apiTest(
    'refuses a caller with only `read_security`, since reading takes `manage_security` too',
    async ({ apiClient, samlAuth }) => {
      // Kibana access is granted, so any refusal below is attributable to the cluster privilege
      // rather than to the user having no Kibana access. A user rather than an API key, because
      // the key would embed this Kibana-format role and lose its cluster privilege.
      const { cookieHeader } = await samlAuth.asInteractiveUser({
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        elasticsearch: { cluster: ['read_security'] },
      });
      const headers = { ...cookieHeader, ...REQUEST_HEADERS };

      const list = await apiClient.get(SERVICE_ACCOUNT_ENDPOINT, { headers, responseType: 'json' });
      expect(list.statusCode).toBe(403);

      const get = await apiClient.get(getPath(idOf(kibanaManaged)), {
        headers,
        responseType: 'json',
      });
      expect(get.statusCode).toBe(403);
    }
  );

  apiTest('refuses a caller without `manage_security`', async ({ apiClient, samlAuth }) => {
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
