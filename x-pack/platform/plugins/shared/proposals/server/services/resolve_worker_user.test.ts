/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createWorkerUserResolver } from './resolve_worker_user';

const request = httpServerMock.createKibanaRequest();
const params = { executionId: 'gate-exec', spaceId: 'default', request };
const SERVICE_ACCOUNT_ID = 'kibana/alertzero_alert_triage';

const createDeps = () => {
  const security = {
    authc: {
      getPrincipal: jest
        .fn()
        .mockReturnValue({ type: 'service_account', serviceAccountId: SERVICE_ACCOUNT_ID }),
    },
  };
  const workflowsApi = { getWorkflowExecution: jest.fn(), getWorkflow: jest.fn() };
  return {
    security,
    workflowsApi,
    resolve: createWorkerUserResolver({
      security: security as never,
      getWorkflowsApi: () => workflowsApi as never,
      logger: loggerMock.create(),
    }),
  };
};

describe('createWorkerUserResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should name the Worker after the workflow at the root of the execution chain', async () => {
    const { workflowsApi, resolve } = createDeps();
    workflowsApi.getWorkflowExecution.mockResolvedValue({
      context: {
        executionChain: [
          {
            executionId: 'root-exec',
            workflowId: 'system-floor-alert-triage',
            invocation: 'async',
          },
          { executionId: 'review-exec', workflowId: 'system-review', invocation: 'sync' },
        ],
      },
    });
    workflowsApi.getWorkflow.mockResolvedValue({ name: 'Alert Triage' });

    await expect(resolve(params)).resolves.toEqual({
      username: SERVICE_ACCOUNT_ID,
      fullName: 'Alert Triage worker',
      email: null,
    });
    expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith('gate-exec', 'default', {
      request,
      omitStepExecutions: true,
    });
    expect(workflowsApi.getWorkflow).toHaveBeenCalledWith(
      'system-floor-alert-triage',
      'default',
      request
    );
  });

  it('should not resolve a principal that is not a service account', async () => {
    const { security, workflowsApi, resolve } = createDeps();
    security.authc.getPrincipal.mockReturnValue({ type: 'user', username: 'analyst' });

    await expect(resolve(params)).resolves.toBeUndefined();
    expect(workflowsApi.getWorkflowExecution).not.toHaveBeenCalled();
  });

  it.each([
    ['the execution is not found', null],
    ['the execution has no chain', { context: {} }],
    ['the chain is empty', { context: { executionChain: [] } }],
    ['the root hop has no workflow id', { context: { executionChain: [{ executionId: 'x' }] } }],
  ])('should keep the account id as the username when %s', async (_, execution) => {
    const { workflowsApi, resolve } = createDeps();
    workflowsApi.getWorkflowExecution.mockResolvedValue(execution);

    await expect(resolve(params)).resolves.toEqual({
      username: SERVICE_ACCOUNT_ID,
      fullName: null,
      email: null,
    });
    expect(workflowsApi.getWorkflow).not.toHaveBeenCalled();
  });

  it('should keep the account id as the username when the root workflow no longer exists', async () => {
    const { workflowsApi, resolve } = createDeps();
    workflowsApi.getWorkflowExecution.mockResolvedValue({
      context: { executionChain: [{ workflowId: 'gone' }] },
    });
    workflowsApi.getWorkflow.mockResolvedValue(null);

    await expect(resolve(params)).resolves.toEqual({
      username: SERVICE_ACCOUNT_ID,
      fullName: null,
      email: null,
    });
  });

  it('should keep the account id as the username rather than fail when a lookup throws', async () => {
    const { workflowsApi, resolve } = createDeps();
    workflowsApi.getWorkflowExecution.mockRejectedValue(new Error('index unavailable'));

    await expect(resolve(params)).resolves.toEqual({
      username: SERVICE_ACCOUNT_ID,
      fullName: null,
      email: null,
    });
  });
});
