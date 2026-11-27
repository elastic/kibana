/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { logWorkflowExecutionFailure } from './log_workflow_execution_failure';

jest.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: { currentTransaction: null },
}));

const mockedApm = apm as unknown as { currentTransaction: { setLabel: jest.Mock } | null };

const buildExecution = (overrides: Partial<EsWorkflowExecution> = {}): EsWorkflowExecution =>
  ({
    id: 'run-1',
    workflowId: 'system-nightshift-agent-optimize-bound-default',
    spaceId: 'default',
    status: 'failed',
    error: { type: 'StepError', message: 'contains user data: secret' },
    ...overrides,
  } as unknown as EsWorkflowExecution);

describe('logWorkflowExecutionFailure', () => {
  let setLabel: jest.Mock;

  beforeEach(() => {
    setLabel = jest.fn();
    mockedApm.currentTransaction = { setLabel };
  });

  afterEach(() => {
    mockedApm.currentTransaction = null;
  });

  it('identifies the managed workflow and failed step in the log and transaction labels', () => {
    const logger = loggingSystemMock.createLogger();

    logWorkflowExecutionFailure({
      logger,
      execution: buildExecution({
        managed: true,
        originManagedWorkflowId: 'system-nightshift-agent-optimize-bound',
      }),
      failedStepContext: { stepId: 'optimize_agent' } as never,
    });

    expect(logger.warn).toHaveBeenCalledWith('Workflow execution failed', {
      workflowRunId: 'run-1',
      spaceId: 'default',
      isManaged: true,
      workflowId: 'system-nightshift-agent-optimize-bound-default',
      originManagedWorkflowId: 'system-nightshift-agent-optimize-bound',
      failedStepId: 'optimize_agent',
      errorType: 'StepError',
    });
    expect(setLabel).toHaveBeenCalledWith('workflow_outcome', 'failed');
    expect(setLabel).toHaveBeenCalledWith('is_managed_workflow', true);
    expect(setLabel).toHaveBeenCalledWith(
      'managed_workflow_id',
      'system-nightshift-agent-optimize-bound'
    );
    expect(setLabel).toHaveBeenCalledWith('workflow_failed_step_id', 'optimize_agent');
  });

  it('falls back to the workflow id when a managed execution has no origin id', () => {
    const logger = loggingSystemMock.createLogger();

    logWorkflowExecutionFailure({
      logger,
      execution: buildExecution({ managed: true }),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'Workflow execution failed',
      expect.not.objectContaining({ originManagedWorkflowId: expect.anything() })
    );
    expect(setLabel).toHaveBeenCalledWith(
      'managed_workflow_id',
      'system-nightshift-agent-optimize-bound-default'
    );
  });

  it('does not log the workflow id or step id of user workflows', () => {
    const logger = loggingSystemMock.createLogger();

    logWorkflowExecutionFailure({
      logger,
      execution: buildExecution({ workflowId: 'my-secret-workflow-name' }),
      failedStepContext: { stepId: 'my_secret_step' } as never,
    });

    expect(logger.warn).toHaveBeenCalledWith('Workflow execution failed', {
      workflowRunId: 'run-1',
      spaceId: 'default',
      isManaged: false,
      errorType: 'StepError',
    });
    expect(setLabel).toHaveBeenCalledWith('workflow_outcome', 'failed');
    expect(setLabel).toHaveBeenCalledWith('is_managed_workflow', false);
    expect(setLabel).not.toHaveBeenCalledWith('managed_workflow_id', expect.anything());
    expect(setLabel).not.toHaveBeenCalledWith('workflow_failed_step_id', expect.anything());
  });

  it('never logs the error message', () => {
    const logger = loggingSystemMock.createLogger();

    logWorkflowExecutionFailure({ logger, execution: buildExecution({ managed: true }) });

    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('secret');
  });

  it('still logs when there is no active APM transaction', () => {
    mockedApm.currentTransaction = null;
    const logger = loggingSystemMock.createLogger();

    expect(() =>
      logWorkflowExecutionFailure({ logger, execution: buildExecution({ managed: true }) })
    ).not.toThrow();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
