/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { waitForAuditEvent } from '../fixtures/audit_log_file';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
const uniqueName = () => `sa-audit-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

apiTest.describe('Service account audit events', { tag: ['@local-stateful-classic'] }, () => {
  const accounts: ServiceAccountPrincipal[] = [];
  const roleName = uniqueName();
  const dashboardId = uniqueName();
  let adminHeaders: Record<string, string>;
  let adminUsername: string;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth }) => {
    // Enough to read the dashboard the workload fetches, in every space.
    await esClient.security.putRole({
      name: roleName,
      applications: [{ application: 'kibana-.kibana', privileges: ['read'], resources: ['*'] }],
      refresh: 'wait_for',
    });
    await kbnClient.savedObjects.create({
      type: 'dashboard',
      id: dashboardId,
      attributes: { title: 'Service account audit' },
      overwrite: true,
    });
    adminHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
    const me = await apiClient.get('internal/security/me', {
      headers: adminHeaders,
      responseType: 'json',
    });
    expect(me).toHaveStatusCode(200);
    adminUsername = me.body.username;
  });

  apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
    const failures: Error[] = [];
    const cleanup = [
      async () => deleteServiceAccounts(esClient, config, accounts),
      async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
      async () => kbnClient.savedObjects.delete({ type: 'dashboard', id: dashboardId }),
    ];
    for (const remove of cleanup) {
      try {
        await remove();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error('Audit fixture cleanup failed.'));
      }
    }
    if (failures.length)
      throw new AggregateError(failures, 'Service account audit cleanup failed.');
  });

  apiTest(
    'audits a create, and a create the user is not authorized for',
    async ({ apiClient, samlAuth }) => {
      const since = Date.now();
      const name = uniqueName();
      accounts.push({ namespace: 'kibana', name });

      const created = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: adminHeaders,
        body: { name, roles: [roleName] },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);

      const createEvent = await waitForAuditEvent(
        (record) =>
          record.event?.action === 'service_account_create' && record.user?.target?.name === name,
        { since }
      );
      expect(createEvent).toMatchObject({
        event: { category: ['iam'], type: ['user', 'creation'], outcome: 'success' },
        user: { name: adminUsername, target: { id: `kibana/${name}`, name } },
      });

      const refusedName = uniqueName();
      accounts.push({ namespace: 'kibana', name: refusedName });
      const viewerHeaders = {
        ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
        ...HEADERS,
      };
      const refused = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
        headers: viewerHeaders,
        body: { name: refusedName, roles: [roleName] },
        responseType: 'json',
      });
      expect(refused).toHaveStatusCode(403);

      const refusedEvent = await waitForAuditEvent(
        (record) =>
          record.event?.action === 'service_account_create' &&
          record.user?.target?.name === refusedName,
        { since }
      );
      expect(refusedEvent).toMatchObject({
        event: { outcome: 'failure' },
        user: { target: { name: refusedName } },
      });
      expect(refusedEvent.user?.name).not.toBe(adminUsername);
    }
  );

  apiTest('audits a binding, the execution under it, and the unbind', async ({ apiClient }) => {
    const since = Date.now();
    const name = uniqueName();
    const accountId = `kibana/${name}`;
    // The test plugin keys its workload by the path segment, so it is unique per run too.
    const endpoint = `internal/service_accounts_test/${name}`;
    const workload = { plugin_id: 'serviceAccountsTest', type: 'job', id: name };
    accounts.push({ namespace: 'kibana', name });

    const created = await apiClient.post(SERVICE_ACCOUNT_ENDPOINT, {
      headers: adminHeaders,
      body: { name, roles: [roleName] },
      responseType: 'json',
    });
    expect(created).toHaveStatusCode(200);

    const bound = await apiClient.post(endpoint, {
      headers: adminHeaders,
      body: { operation: 'bind', serviceAccountId: accountId },
      responseType: 'json',
    });
    expect(bound).toHaveStatusCode(200);
    const bindEvent = await waitForAuditEvent(
      (record) =>
        record.event?.action === 'service_account_workload_bind' &&
        record.kibana?.workload?.id === name,
      { since }
    );
    expect(bindEvent).toMatchObject({
      event: { category: ['iam'], type: ['user', 'change'], outcome: 'unknown' },
      user: { name: adminUsername, target: { id: accountId } },
      kibana: { workload },
    });

    const executed = await apiClient.post(endpoint, {
      headers: adminHeaders,
      body: { operation: 'execute', action: 'get_saved_object', savedObjectId: dashboardId },
      responseType: 'json',
    });
    expect(executed).toHaveStatusCode(200);
    expect(executed.body).toStrictEqual({ savedObjectStatus: 200 });

    const assumeEvent = await waitForAuditEvent(
      (record) =>
        record.event?.action === 'service_account_assume' && record.kibana?.workload?.id === name,
      { since }
    );
    expect(assumeEvent).toMatchObject({
      event: { category: ['authentication'], type: ['start'], outcome: 'success' },
      user: { id: accountId, name: accountId },
      kibana: { workload, space_id: 'default' },
    });
    expect(assumeEvent.user?.roles).toBeUndefined();
    const traceId = assumeEvent.trace?.id;
    expect(traceId).toBeDefined();

    // What the workload did is attributed to the account, and shares the assume event's trace.
    const readEvent = await waitForAuditEvent(
      (record) =>
        record.event?.action === 'saved_object_get' &&
        record.kibana?.saved_object?.id === dashboardId &&
        record.trace?.id === traceId,
      { since }
    );
    expect(readEvent.user).toStrictEqual({ id: accountId, name: accountId });

    // The request that started the execution is the admin's own, under a trace of its own. It
    // is the latest request to the workload's route so far: the unbind has not been sent yet.
    const outerRequest = await waitForAuditEvent(
      (record) => record.event?.action === 'http_request' && record.url?.path === `/${endpoint}`,
      { since }
    );
    expect(outerRequest.user?.name).toBe(adminUsername);
    expect(outerRequest.trace?.id).not.toBe(traceId);

    const unbound = await apiClient.post(endpoint, {
      headers: adminHeaders,
      body: { operation: 'unbind' },
      responseType: 'json',
    });
    expect(unbound).toHaveStatusCode(200);
    const unbindEvent = await waitForAuditEvent(
      (record) =>
        record.event?.action === 'service_account_workload_unbind' &&
        record.kibana?.workload?.id === name,
      { since }
    );
    expect(unbindEvent).toMatchObject({
      event: { outcome: 'unknown' },
      user: { name: adminUsername, target: { id: accountId } },
      kibana: { workload },
    });
  });
});
