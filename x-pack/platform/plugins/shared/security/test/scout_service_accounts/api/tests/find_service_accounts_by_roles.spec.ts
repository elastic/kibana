/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
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
const FIND_BY_ROLES_ENDPOINT = `${SERVICE_ACCOUNT_ENDPOINT}/_find_by_roles`;
const REQUEST_HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
/** A namespace Kibana never writes to, for accounts created straight through Elasticsearch. */
const FOREIGN_NAMESPACE = 'scout';

/** Unique per run, so a failed cleanup cannot make the next run collide. */
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

interface FoundServiceAccount {
  id: string;
  name: string;
  roles: string[];
  enabled: boolean;
  workloadCount?: number;
}

interface FindResponse {
  serviceAccounts: FoundServiceAccount[];
  complete: boolean;
}

apiTest.describe('Find Elasticsearch service accounts by role', { tag: LOCAL_ONLY }, () => {
  const created: ServiceAccountPrincipal[] = [];
  const boundWorkloads: TestWorkload[] = [];
  const createdRoles: string[] = [];

  let adminHeaders: Record<string, string>;
  /** Held by `bound` and `foreign`. */
  let sharedRole: string;
  /** Held by `bound` only. */
  let otherRole: string;
  let bound: ServiceAccountPrincipal;
  let foreign: ServiceAccountPrincipal;
  let unrelated: ServiceAccountPrincipal;

  const idOf = ({ namespace, name }: ServiceAccountPrincipal) => `${namespace}/${name}`;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...cookieHeader, ...REQUEST_HEADERS };

    sharedRole = uniqueName('scout-shared');
    otherRole = uniqueName('scout-other');
    for (const name of [sharedRole, otherRole]) {
      createdRoles.push(name);
      await esClient.security.putRole({ name, cluster: ['monitor'], refresh: 'wait_for' });
    }

    const createThroughKibana = async (roles: string[]) => {
      const account = { namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: uniqueName('by-role') };
      created.push(account);
      const response = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        responseType: 'json',
        body: { name: account.name, roles },
      });
      expect(response).toHaveStatusCode(200);
      return account;
    };

    bound = await createThroughKibana([sharedRole, otherRole, 'viewer']);
    unrelated = await createThroughKibana(['viewer']);

    // Disabled, and created outside Kibana: it still holds the role.
    foreign = { namespace: FOREIGN_NAMESPACE, name: uniqueName('foreign') };
    created.push(foreign);
    await esClient.transport.request({
      method: 'PUT',
      path: `/_security/service/${foreign.namespace}/${foreign.name}`,
      body: { roles: [sharedRole], enabled: false },
      querystring: { refresh: 'wait_for' },
    });

    const workloadId = uniqueName('workload');
    boundWorkloads.push({ workloadId });
    await bindWorkload(kbnClient, workloadId, idOf(bound));
  });

  apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
    // Every step runs, even when an earlier one fails, so one failure doesn't leave the rest
    // behind.
    const failures: Error[] = [];
    const cleanup = [
      async () => unbindWorkloads(kbnClient, boundWorkloads),
      async () => deleteServiceAccounts(esClient, config, created),
      async () => {
        for (const name of createdRoles) {
          await esClient.security.deleteRole({ name }, { ignore: [404] });
        }
      },
    ];
    for (const remove of cleanup) {
      try {
        await remove();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error('Find cleanup failed.'));
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, 'Find-by-roles cleanup failed.');
    }
  });

  apiTest(
    'finds the accounts holding a role, disabled ones included, with their workload counts',
    async ({ apiClient }) => {
      const response = await apiClient.post(FIND_BY_ROLES_ENDPOINT, {
        headers: adminHeaders,
        responseType: 'json',
        body: { roles: [sharedRole] },
      });

      expect(response).toHaveStatusCode(200);
      const { serviceAccounts, complete } = response.body as FindResponse;
      expect(complete).toBe(true);
      expect(
        [...serviceAccounts].sort((first, second) => first.id.localeCompare(second.id))
      ).toStrictEqual(
        [
          {
            id: idOf(bound),
            name: bound.name,
            roles: [sharedRole],
            enabled: true,
            workloadCount: 1,
          },
          {
            id: idOf(foreign),
            name: foreign.name,
            roles: [sharedRole],
            enabled: false,
            workloadCount: 0,
          },
        ].sort((first, second) => first.id.localeCompare(second.id))
      );
      expect(serviceAccounts.map(({ id }) => id)).not.toContain(idOf(unrelated));
    }
  );

  apiTest('reports only the requested roles each account holds', async ({ apiClient }) => {
    const response = await apiClient.post(FIND_BY_ROLES_ENDPOINT, {
      headers: adminHeaders,
      responseType: 'json',
      body: { roles: [otherRole, sharedRole] },
    });

    expect(response).toHaveStatusCode(200);
    const found = (response.body as FindResponse).serviceAccounts.find(
      ({ id }) => id === idOf(bound)
    );
    expect([...(found?.roles ?? [])].sort()).toStrictEqual([otherRole, sharedRole].sort());
  });

  apiTest('rejects an empty list of roles', async ({ apiClient }) => {
    const response = await apiClient.post(FIND_BY_ROLES_ENDPOINT, {
      headers: adminHeaders,
      responseType: 'json',
      body: { roles: [] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('refuses a caller without `manage_security`', async ({ apiClient, samlAuth }) => {
    // Kibana access is granted, so the refusal is attributable to the cluster privilege.
    const { cookieHeader } = await samlAuth.asInteractiveUser({
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      elasticsearch: { cluster: ['read_security'] },
    });

    const response = await apiClient.post(FIND_BY_ROLES_ENDPOINT, {
      headers: { ...cookieHeader, ...REQUEST_HEADERS },
      responseType: 'json',
      body: { roles: [sharedRole] },
    });

    expect(response).toHaveStatusCode(403);
  });
});
