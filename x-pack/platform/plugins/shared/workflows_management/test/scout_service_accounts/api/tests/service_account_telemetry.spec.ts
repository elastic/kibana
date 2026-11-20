/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createServiceAccountSuite, workflowYaml } from '../fixtures/service_account_suite';

const COMPLETED_EVENT_TYPE = 'workflows_execution_workflow_completed';

const getCompletedEventProperties = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  workflowExecutionId: string
): Promise<Record<string, unknown>> => {
  const query = new URLSearchParams({
    takeNumberOfEvents: '1',
    withTimeoutMs: '10000',
    eventTypes: JSON.stringify([COMPLETED_EVENT_TYPE]),
    filters: JSON.stringify({ 'properties.workflowExecutionId': { eq: workflowExecutionId } }),
  });
  const response = await apiClient.get(`internal/analytics_ftr_helpers/events?${query}`, {
    headers,
    responseType: 'json',
  });
  expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
  expect(response.body).toHaveLength(1);
  return response.body[0].properties;
};

interface BoundWorkloadsUsage {
  total: number;
  serviceAccounts: number;
  byWorkload: Array<{ pluginId: string; workloadType: string; count: number }>;
  byBinderType: Record<string, number>;
}

const countWorkflowBindings = ({ byWorkload }: BoundWorkloadsUsage): number =>
  byWorkload.find(
    ({ pluginId, workloadType }) =>
      pluginId === 'workflowsExecutionEngine' && workloadType === 'workflow'
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
  '[NON-MKI] Workflow service accounts: telemetry',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();

    apiTest.beforeAll(async ({ apiClient, samlAuth, requestAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, requestAuth, config, esClient });
      const optedIn = await apiClient.post('internal/analytics_ftr_helpers/opt_in?consent=true', {
        headers: getContext().sessionHeaders,
        responseType: 'json',
      });
      expect(optedIn).toHaveStatusCode(200);
    });

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    apiTest('reports runAs user for a workflow without run_as', async ({ apiClient }) => {
      const { sessionHeaders, accountId, create, run, wait } = getContext();
      const id = await create(
        apiClient,
        workflowYaml(accountId).replace(`settings:\n  run_as: ${accountId}\n`, '')
      );
      const execution = await wait(apiClient, await run(apiClient, id));
      expect(execution.effectiveIdentity).toBeUndefined();

      const properties = await getCompletedEventProperties(apiClient, sessionHeaders, execution.id);
      expect(properties.runAs).toBe('user');
      expect(properties.runAsInherited).toBeUndefined();
    });

    apiTest(
      'reports runAs service_account for a workflow bound by its own run_as',
      async ({ apiClient }) => {
        const { sessionHeaders, accountId, create, run, wait, expectAccount } = getContext();
        const id = await create(apiClient, workflowYaml(accountId));
        const execution = await wait(apiClient, await run(apiClient, id));
        expectAccount(execution, accountId);

        const properties = await getCompletedEventProperties(
          apiClient,
          sessionHeaders,
          execution.id
        );
        expect(properties).toMatchObject({ runAs: 'service_account', runAsInherited: false });
        expect(JSON.stringify(properties)).not.toContain(accountId);
      }
    );

    apiTest(
      'reports workflows bound by their own run_as in the security usage collector',
      async ({ apiClient }) => {
        const { headers, sessionHeaders, accountId, create } = getContext();
        const before = await getBoundWorkloadsUsage(apiClient, headers);

        // The suite's default headers carry an API key; the session headers carry a user. Binding
        // a different number with each catches telemetry that swaps the two binder types.
        await create(apiClient, workflowYaml(accountId));
        await create(apiClient, workflowYaml(accountId));
        await create(apiClient, workflowYaml(accountId), sessionHeaders);

        const after = await getBoundWorkloadsUsage(apiClient, headers);
        expect(after.total - before.total).toBe(3);
        expect(after.serviceAccounts - before.serviceAccounts).toBe(1);
        expect(countWorkflowBindings(after) - countWorkflowBindings(before)).toBe(3);
        expect(after.byBinderType.api_key - before.byBinderType.api_key).toBe(2);
        expect(after.byBinderType.user - before.byBinderType.user).toBe(1);
        expect(after.byBinderType.service_account - before.byBinderType.service_account).toBe(0);
      }
    );
  }
);
