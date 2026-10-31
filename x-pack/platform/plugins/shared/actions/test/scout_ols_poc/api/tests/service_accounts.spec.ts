/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { ApiClientFixture } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createOlsTestContext,
  type AccessControl,
  type OlsApi,
  type OlsTestContext,
} from '../fixtures/personas';

interface WorkflowExecution {
  status: string;
  error?: { message?: string };
  effectiveIdentity?: { type: string; id: string };
}

// A workflow run is scheduled as a task, so it can take a while to finish.
const WORKFLOW_RUN_TIMEOUT = 60_000;
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out'];

/**
 * A workflow bound to a service account runs its connector steps as that account. Object-level
 * security decides them for the service account, never for the user who started the run.
 */
apiTest.describe('Connectors run by service accounts', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;
  let serviceAccountId: string;
  let cluster: { url: string; user: string; password: string };
  const workflowIds: string[] = [];

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, config }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
    cluster = {
      url: config.hosts.elasticsearch,
      user: config.auth.username,
      password: config.auth.password,
    };
    const created = await apiClient.post('internal/security/service_account', {
      headers: ctx.headers('admin'),
      responseType: 'json',
      body: { name: `ols-runner-${randomUUID().slice(0, 8)}`, roles: [ctx.roles.actionsAll] },
    });
    expect(created, JSON.stringify(created.body)).toHaveStatusCode(200);
    serviceAccountId = created.body.id;
  });

  apiTest.afterAll(async ({ apiClient }) => {
    for (const id of workflowIds) {
      await apiClient.delete(ctx.path(`api/workflows/workflow/${id}?force=true`), {
        headers: ctx.headers('admin'),
      });
    }
    await apiClient.delete(
      `internal/security/service_account/${encodeURIComponent(serviceAccountId)}`,
      {
        headers: ctx.headers('admin'),
      }
    );
    await ctx.cleanup();
  });

  /**
   * Creates an HTTP connector, one of the types Workflows can run, that calls the test cluster.
   */
  const createConnector = async (api: OlsApi, accessControl: AccessControl) => {
    const response = await api.request('owner', 'post', 'api/actions/connector', {
      name: `ols-sa-http-${randomUUID().slice(0, 8)}`,
      connector_type_id: '.http',
      config: { url: cluster.url, hasAuth: true, authType: 'webhook-authentication-basic' },
      secrets: { user: cluster.user, password: cluster.password },
      access_control: accessControl,
    });
    expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
    return response.body.id as string;
  };

  /**
   * Creates a workflow bound to the service account and runs it as the owner. Binding a workflow
   * to a service account takes `manage_security`, so an administrator creates it.
   */
  const runAsServiceAccount = async (
    apiClient: ApiClientFixture,
    api: OlsApi,
    connectorId: string
  ): Promise<WorkflowExecution> => {
    const id = `ols-sa-${randomUUID().slice(0, 8)}`;
    const yaml = `name: Call ${id}
enabled: true
settings:
  run_as: ${serviceAccountId}
triggers:
  - type: manual
steps:
  - name: call
    type: http
    connector-id: ${connectorId}
    with:
      method: GET
      path: /
`;
    const created = await api.request('admin', 'post', 'api/workflows/workflow', { id, yaml });
    expect(created, JSON.stringify(created.body)).toHaveStatusCode(200);
    workflowIds.push(id);

    const run = await api.request('owner', 'post', `api/workflows/workflow/${id}/run`, {
      inputs: {},
    });
    expect(run, JSON.stringify(run.body)).toHaveStatusCode(200);

    const getExecution = async () =>
      (
        await apiClient.get(
          ctx.path(`api/workflows/executions/${run.body.workflowExecutionId}?includeOutput=true`),
          { headers: ctx.headers('owner'), responseType: 'json' }
        )
      ).body as WorkflowExecution;
    await expect
      .poll(async () => TERMINAL_STATUSES.includes((await getExecution()).status), {
        timeout: WORKFLOW_RUN_TIMEOUT,
      })
      .toBe(true);
    return getExecution();
  };

  apiTest('runs a restricted connector that the service account may use', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const connectorId = await createConnector(api, {
      general_access: 'none',
      entries: [{ type: 'service_account', id: serviceAccountId, access: 'use' }],
    });

    const execution = await runAsServiceAccount(apiClient, api, connectorId);

    expect(execution.effectiveIdentity).toStrictEqual({
      type: 'service_account',
      id: serviceAccountId,
    });
    expect(execution.status, JSON.stringify(execution.error)).toBe('completed');
  });

  apiTest(
    'refuses a restricted connector without a grant, even when its owner starts the run',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const connectorId = await createConnector(api, { general_access: 'none' });

      const execution = await runAsServiceAccount(apiClient, api, connectorId);

      expect(execution.status).toBe('failed');
      expect(execution.error?.message).toContain('not found');
    }
  );

  apiTest('runs a connector that everyone may use', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const connectorId = await createConnector(api, { general_access: 'use' });

    const execution = await runAsServiceAccount(apiClient, api, connectorId);

    expect(execution.status, JSON.stringify(execution.error)).toBe('completed');
  });
});
