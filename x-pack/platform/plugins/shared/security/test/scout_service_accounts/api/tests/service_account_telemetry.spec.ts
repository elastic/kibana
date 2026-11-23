/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ApiClientFixture, apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';
import {
  type TestWorkload,
  unbindWorkloads,
  workloadPath,
} from '../fixtures/service_account_workloads';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const uniqueName = () => `sa-telemetry-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

interface BoundWorkloadsUsage {
  total: number;
  serviceAccounts: number;
  byWorkload: Array<{ pluginId: string; workloadType: string; count: number }>;
  byBinderType: Record<string, number>;
}

const countTestWorkloads = ({ byWorkload }: BoundWorkloadsUsage): number =>
  byWorkload.find(
    ({ pluginId, workloadType }) => pluginId === 'serviceAccountsTest' && workloadType === 'job'
  )?.count ?? 0;

const getBoundWorkloadsUsage = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<BoundWorkloadsUsage> => {
  const response = await apiClient.post('internal/telemetry/clusters/_stats', {
    headers: { ...headers, 'elastic-api-version': '2' },
    body: { unencrypted: true, refreshCache: true },
    responseType: 'json',
  });
  expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
  const { enabled, boundWorkloads } =
    response.body[0].stats.stack_stats.kibana.plugins.security.serviceAccounts;
  expect(enabled).toBe(true);
  expect(boundWorkloads).toBeDefined();
  const usage: BoundWorkloadsUsage = boundWorkloads;
  const { total, serviceAccounts, byWorkload, byBinderType } = usage;
  const counts = [
    total,
    serviceAccounts,
    ...byWorkload.map(({ count }) => count),
    byBinderType.user,
    byBinderType.api_key,
    byBinderType.service_account,
  ];
  for (const count of counts) expect(typeof count).toBe('number');
  return usage;
};

apiTest.describe(
  'Service account bound-workload telemetry',
  { tag: ['@local-stateful-classic'] },
  () => {
    const accounts: ServiceAccountPrincipal[] = [];
    const boundWorkloads: TestWorkload[] = [];
    const name = uniqueName();
    const accountId = `kibana/${name}`;
    let sessionHeaders: Record<string, string>;
    let apiKeyHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, samlAuth, requestAuth }) => {
      sessionHeaders = { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS };
      apiKeyHeaders = { ...(await requestAuth.getApiKey('admin')).apiKeyHeader, ...HEADERS };
      accounts.push({ namespace: 'kibana', name });
      const created = await apiClient.post('internal/security/service_account', {
        headers: sessionHeaders,
        body: { name, roles: ['viewer'] },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
      const failures: Error[] = [];
      for (const cleanup of [
        () => unbindWorkloads(kbnClient, boundWorkloads),
        () => deleteServiceAccounts(esClient, config, accounts),
      ]) {
        try {
          await cleanup();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Service account cleanup failed.')
          );
        }
      }
      if (failures.length) throw new AggregateError(failures, 'Service account cleanup failed.');
    });

    apiTest(
      'counts bindings and their binder types in the security usage collector',
      async ({ apiClient }) => {
        const before = await getBoundWorkloadsUsage(apiClient, sessionHeaders);

        // Different counts for each binder catch telemetry that swaps user and API key totals.
        for (const headers of [apiKeyHeaders, apiKeyHeaders, sessionHeaders]) {
          const workloadId = uniqueName();
          const bound = await apiClient.post(workloadPath(workloadId), {
            headers,
            body: { operation: 'bind', serviceAccountId: accountId },
            responseType: 'json',
          });
          expect(bound).toHaveStatusCode(200);
          boundWorkloads.push({ workloadId });
        }

        const after = await getBoundWorkloadsUsage(apiClient, sessionHeaders);
        expect(after.total - before.total).toBe(3);
        expect(after.serviceAccounts - before.serviceAccounts).toBe(1);
        expect(countTestWorkloads(after) - countTestWorkloads(before)).toBe(3);
        expect(after.byBinderType.api_key - before.byBinderType.api_key).toBe(2);
        expect(after.byBinderType.user - before.byBinderType.user).toBe(1);
        expect(after.byBinderType.service_account - before.byBinderType.service_account).toBe(0);
      }
    );
  }
);
