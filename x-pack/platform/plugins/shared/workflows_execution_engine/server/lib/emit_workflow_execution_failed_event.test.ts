/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { emitWorkflowExecutionFailedEventIfFailed } from './emit_workflow_execution_failed_event';

const buildExecution = (overrides: Partial<EsWorkflowExecution> = {}): EsWorkflowExecution =>
  ({
    id: 'run-1',
    workflowId: 'system-nightshift-agent-optimize-bound-default',
    spaceId: 'default',
    managed: true,
    originManagedWorkflowId: 'system-nightshift-agent-optimize-bound',
    status: ExecutionStatus.FAILED,
    createdAt: '2026-11-27T00:00:00.000Z',
    error: { type: 'StepError', message: 'boom' },
    isTestRun: false,
    ...overrides,
  } as unknown as EsWorkflowExecution);

const setup = (status: ExecutionStatus, execution: EsWorkflowExecution) => {
  const logger = loggingSystemMock.createLogger();
  const emitEvent = jest.fn().mockResolvedValue(undefined);
  const params = {
    workflowRuntime: {
      getWorkflowExecutionStatus: () => status,
      getWorkflowExecution: () => execution,
    },
    workflowExecutionState: {
      getLastFailedStepContext: () => ({ stepId: 'optimize_agent' } as never),
    },
    emitEvent,
    request: httpServerMock.createKibanaRequest() as KibanaRequest,
    logger,
    workflowRunId: 'run-1',
  };
  return { logger, emitEvent, params };
};

describe('emitWorkflowExecutionFailedEventIfFailed', () => {
  it('logs the failed managed workflow and emits the failed event', async () => {
    const { logger, emitEvent, params } = setup(ExecutionStatus.FAILED, buildExecution());

    await emitWorkflowExecutionFailedEventIfFailed(params);

    expect(logger.warn).toHaveBeenCalledWith(
      'Workflow execution failed',
      expect.objectContaining({
        workflowRunId: 'run-1',
        isManaged: true,
        originManagedWorkflowId: 'system-nightshift-agent-optimize-bound',
        failedStepId: 'optimize_agent',
      })
    );
    expect(emitEvent).toHaveBeenCalledTimes(1);
  });

  it('neither logs nor emits for executions that did not fail', async () => {
    const { logger, emitEvent, params } = setup(
      ExecutionStatus.COMPLETED,
      buildExecution({ status: ExecutionStatus.COMPLETED })
    );

    await emitWorkflowExecutionFailedEventIfFailed(params);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
  });

  it('neither logs nor emits for test runs', async () => {
    const { logger, emitEvent, params } = setup(
      ExecutionStatus.FAILED,
      buildExecution({ isTestRun: true })
    );

    await emitWorkflowExecutionFailedEventIfFailed(params);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
  });
});
