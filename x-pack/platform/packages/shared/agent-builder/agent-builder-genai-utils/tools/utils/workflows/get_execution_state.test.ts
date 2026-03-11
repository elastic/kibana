/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { getExecutionState } from './get_execution_state';
import { getWorkflowOutput } from './get_workflow_output';

jest.mock('./get_workflow_output', () => ({
  getWorkflowOutput: jest.fn(),
}));

const getWorkflowOutputMock = jest.mocked(getWorkflowOutput);

describe('getExecutionState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWorkflowApi = () =>
    ({
      getWorkflowExecution: jest.fn(),
    } as unknown as Parameters<typeof getExecutionState>[0]['workflowApi']);

  it('returns null when execution is not found', async () => {
    const workflowApi = createWorkflowApi();
    workflowApi.getWorkflowExecution = jest.fn().mockResolvedValue(null);

    const state = await getExecutionState({
      executionId: 'exec-1',
      spaceId: 'default',
      workflowApi,
    });

    expect(state).toBeNull();
  });

  it('includes output for completed execution', async () => {
    const workflowApi = createWorkflowApi();
    const stepExecutions = [{ id: 'step-1' }];
    workflowApi.getWorkflowExecution = jest.fn().mockResolvedValue({
      status: ExecutionStatus.COMPLETED,
      workflowId: 'workflow-1',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:05.000Z',
      workflowDefinition: { name: 'Workflow One' },
      stepExecutions,
    });
    getWorkflowOutputMock.mockReturnValue({ transformed: true });

    const state = await getExecutionState({
      executionId: 'exec-1',
      spaceId: 'default',
      workflowApi,
    });

    expect(state).toEqual({
      execution_id: 'exec-1',
      status: ExecutionStatus.COMPLETED,
      workflow_id: 'workflow-1',
      started_at: '2026-01-01T00:00:00.000Z',
      finished_at: '2026-01-01T00:00:05.000Z',
      workflow_name: 'Workflow One',
      output: { transformed: true },
    });
    expect(getWorkflowOutputMock).toHaveBeenCalledWith(stepExecutions);
  });

  it('includes error_message for failed execution with error details', async () => {
    const workflowApi = createWorkflowApi();
    workflowApi.getWorkflowExecution = jest.fn().mockResolvedValue({
      status: ExecutionStatus.FAILED,
      workflowId: 'workflow-2',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:05.000Z',
      workflowDefinition: { name: 'Workflow Two' },
      stepExecutions: [],
      error: { message: 'Step timed out' },
    });

    const state = await getExecutionState({
      executionId: 'exec-2',
      spaceId: 'default',
      workflowApi,
    });

    expect(state).toEqual({
      execution_id: 'exec-2',
      status: ExecutionStatus.FAILED,
      workflow_id: 'workflow-2',
      started_at: '2026-01-01T00:00:00.000Z',
      finished_at: '2026-01-01T00:00:05.000Z',
      workflow_name: 'Workflow Two',
      error_message: 'Step timed out',
    });
    expect(getWorkflowOutputMock).not.toHaveBeenCalled();
  });

  it('does not include error_message for failed execution without error', async () => {
    const workflowApi = createWorkflowApi();
    workflowApi.getWorkflowExecution = jest.fn().mockResolvedValue({
      status: ExecutionStatus.FAILED,
      workflowId: 'workflow-3',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:05.000Z',
      workflowDefinition: { name: 'Workflow Three' },
      stepExecutions: [],
    });

    const state = await getExecutionState({
      executionId: 'exec-3',
      spaceId: 'default',
      workflowApi,
    });

    expect(state).toEqual({
      execution_id: 'exec-3',
      status: ExecutionStatus.FAILED,
      workflow_id: 'workflow-3',
      started_at: '2026-01-01T00:00:00.000Z',
      finished_at: '2026-01-01T00:00:05.000Z',
      workflow_name: 'Workflow Three',
    });
    expect(getWorkflowOutputMock).not.toHaveBeenCalled();
  });
});
