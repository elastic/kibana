/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { EVALS_EXPERIMENTS_RUN_URL, API_VERSIONS } from '@kbn/evals-common';
import { registerRunExperimentRoute } from './run_experiment';
import type { RouteDependencies } from '../register_routes';
import { generateExperimentRun } from '../../workflow_generator';
import { findUnauthorizedTargetSpaces } from '../shared/authorize_target_spaces';

jest.mock('../../workflow_generator', () => ({
  experimentRequestToParams: jest.fn((body) => body),
  generateExperimentRun: jest.fn(),
}));

jest.mock('../shared/authorize_target_spaces', () => ({
  findUnauthorizedTargetSpaces: jest.fn().mockResolvedValue([]),
}));

const generateExperimentRunMock = generateExperimentRun as jest.Mock;
const findUnauthorizedTargetSpacesMock = findUnauthorizedTargetSpaces as jest.Mock;

interface Execution {
  executionId: string;
  connectorId: string;
  yaml: string;
}

const runOf = (executions: Execution[]) => ({
  executionId: 'e1',
  mode: 'cross-model' as const,
  compareBy: 'execution' as const,
  experimentIds: executions.map((execution) => `x-${execution.executionId}`),
  executions,
});

describe('POST /internal/evals/experiments/_run', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const executeWorkflow = jest.fn();
    const cancelWorkflowExecution = jest.fn().mockResolvedValue({ cancelled: true });

    registerRunExperimentRoute({
      router,
      logger,
      workflowsManagement: { management: { executeWorkflow, cancelWorkflowExecution } },
      getSpaceId: async () => 'default',
      checkManageEvalsPrivileges: jest.fn().mockResolvedValue(true),
    } as unknown as RouteDependencies);

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', EVALS_EXPERIMENTS_RUN_URL).versions[
      API_VERSIONS.internal.v1
    ];
    const context = coreMock.createCustomRequestHandlerContext({});

    const invoke = () =>
      handler(
        context,
        httpServerMock.createKibanaRequest({
          method: 'post',
          path: EVALS_EXPERIMENTS_RUN_URL,
          body: {},
        }),
        kibanaResponseFactory
      );

    return { invoke, logger, executeWorkflow, cancelWorkflowExecution };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findUnauthorizedTargetSpacesMock.mockResolvedValue([]);
  });

  it('launches every execution and returns their ids without cancelling anything', async () => {
    const { invoke, executeWorkflow, cancelWorkflowExecution } = setup();
    generateExperimentRunMock.mockReturnValue(
      runOf([
        { executionId: 'e1', connectorId: 'c1', yaml: 'yaml-1' },
        { executionId: 'e2', connectorId: 'c2', yaml: 'yaml-2' },
      ])
    );
    executeWorkflow
      .mockResolvedValueOnce({ workflowExecutionId: 'wf-1' })
      .mockResolvedValueOnce({ workflowExecutionId: 'wf-2' });

    const response = await invoke();

    expect(response.status).toBe(200);
    expect(response.payload.workflow_execution_ids).toEqual(['wf-1', 'wf-2']);
    expect(cancelWorkflowExecution).not.toHaveBeenCalled();
  });

  it('best-effort cancels already-launched executions when a later launch fails', async () => {
    const { invoke, logger, executeWorkflow, cancelWorkflowExecution } = setup();
    generateExperimentRunMock.mockReturnValue(
      runOf([
        { executionId: 'e1', connectorId: 'c1', yaml: 'yaml-1' },
        { executionId: 'e2', connectorId: 'c2', yaml: 'yaml-2' },
      ])
    );
    executeWorkflow
      .mockResolvedValueOnce({ workflowExecutionId: 'wf-1' })
      .mockRejectedValueOnce(new Error('workflow engine boom'));

    const response = await invoke();

    expect(response.status).toBe(500);
    // The one that already launched is cancelled so it isn't stranded uncancellable.
    expect(cancelWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(cancelWorkflowExecution).toHaveBeenCalledWith('wf-1', 'default', expect.anything());
    expect(logger.error).toHaveBeenCalled();
  });

  it('logs the orphan and still returns 500 when the best-effort cancellation itself fails', async () => {
    const { invoke, logger, executeWorkflow, cancelWorkflowExecution } = setup();
    generateExperimentRunMock.mockReturnValue(
      runOf([
        { executionId: 'e1', connectorId: 'c1', yaml: 'yaml-1' },
        { executionId: 'e2', connectorId: 'c2', yaml: 'yaml-2' },
      ])
    );
    executeWorkflow
      .mockResolvedValueOnce({ workflowExecutionId: 'wf-1' })
      .mockRejectedValueOnce(new Error('workflow engine boom'));
    cancelWorkflowExecution.mockRejectedValue(new Error('cancel failed'));

    const response = await invoke();

    expect(response.status).toBe(500);
    expect(cancelWorkflowExecution).toHaveBeenCalledTimes(1);
    // The client can no longer reach this run, so its id has to be recoverable from the logs.
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cancel orphaned experiment workflow execution wf-1')
    );
  });

  it('does not attempt cancellation when the first launch fails', async () => {
    const { invoke, executeWorkflow, cancelWorkflowExecution } = setup();
    generateExperimentRunMock.mockReturnValue(
      runOf([
        { executionId: 'e1', connectorId: 'c1', yaml: 'yaml-1' },
        { executionId: 'e2', connectorId: 'c2', yaml: 'yaml-2' },
      ])
    );
    executeWorkflow.mockRejectedValueOnce(new Error('workflow engine boom'));

    const response = await invoke();

    expect(response.status).toBe(500);
    expect(cancelWorkflowExecution).not.toHaveBeenCalled();
  });
});
