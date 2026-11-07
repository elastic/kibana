/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import { GraphTraversalClient, type GraphTraversalWorkflowRunner } from './graph_traversal_client';
import { GraphTraversalError } from './graph_traversal_error';

const request = {} as KibanaRequest;

const workflow = {
  id: 'system-security-entity-graph-traversal',
  name: 'Security - Entity graph traversal',
  enabled: true,
  valid: true,
  definition: { name: 'x', steps: [] },
  yaml: 'name: x',
} as unknown as WorkflowDetailDto;

const execution = (
  status: ExecutionStatus,
  extra: Partial<WorkflowExecutionDto> = {}
): WorkflowExecutionDto =>
  ({ id: 'exec-1', status, error: null, ...extra } as unknown as WorkflowExecutionDto);

const output = {
  scenario_id: 'okta-user-to-aws-resources',
  nodes: [{ id: 'user:a@b@okta', hop: 1, via: 'seed' }],
  edges: [],
};

const createRunner = () => {
  const runner: jest.Mocked<GraphTraversalWorkflowRunner> = {
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    runWorkflow: jest.fn().mockResolvedValue('exec-1'),
    getWorkflowExecution: jest.fn(),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  };
  return runner;
};

const createClient = (runner: GraphTraversalWorkflowRunner | undefined) =>
  new GraphTraversalClient({
    logger: loggerMock.create(),
    namespace: 'default',
    getWorkflowsManagement: async () => runner,
    pollIntervalMs: 0,
    sleep: async () => {},
  });

describe('GraphTraversalClient', () => {
  it('runs the workflow with the inputs and returns the output once the execution completes', async () => {
    const runner = createRunner();
    runner.getWorkflowExecution
      .mockResolvedValueOnce(execution(ExecutionStatus.RUNNING))
      .mockResolvedValueOnce(
        execution(ExecutionStatus.COMPLETED, {
          context: { output },
        } as Partial<WorkflowExecutionDto>)
      );

    const result = await createClient(runner).run({
      workflowId: workflow.id,
      inputs: { scenario_id: 'okta-user-to-aws-resources', seed_id: 'user:a@b@okta' },
      request,
    });

    expect(runner.getWorkflow).toHaveBeenCalledWith(workflow.id, 'default', request);
    expect(runner.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflow.id }),
      'default',
      { scenario_id: 'okta-user-to-aws-resources', seed_id: 'user:a@b@okta' },
      request,
      'entity_store_graph_traversal'
    );
    expect(runner.getWorkflowExecution).toHaveBeenLastCalledWith('exec-1', 'default', {
      includeOutput: true,
      request,
    });
    expect(result).toMatchObject({
      execution_id: 'exec-1',
      status: ExecutionStatus.COMPLETED,
      output,
    });
    expect(runner.cancelWorkflowExecution).not.toHaveBeenCalled();
  });

  it('returns the execution error when the workflow fails', async () => {
    const runner = createRunner();
    runner.getWorkflowExecution.mockResolvedValueOnce(
      execution(ExecutionStatus.FAILED, {
        error: { message: 'boom' },
      } as Partial<WorkflowExecutionDto>)
    );

    const result = await createClient(runner).run({
      workflowId: workflow.id,
      inputs: {},
      request,
    });

    expect(result).toMatchObject({ status: ExecutionStatus.FAILED, output: null, error: 'boom' });
  });

  it('keeps polling through transient read failures', async () => {
    const runner = createRunner();
    runner.getWorkflowExecution
      .mockRejectedValueOnce(new Error('not yet'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        execution(ExecutionStatus.COMPLETED, {
          context: { output },
        } as Partial<WorkflowExecutionDto>)
      );

    const result = await createClient(runner).run({ workflowId: workflow.id, inputs: {}, request });

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(runner.getWorkflowExecution).toHaveBeenCalledTimes(3);
  });

  it('cancels the execution and fails with 504 when the deadline passes', async () => {
    const runner = createRunner();
    runner.getWorkflowExecution.mockResolvedValue(execution(ExecutionStatus.RUNNING));

    await expect(
      createClient(runner).run({ workflowId: workflow.id, inputs: {}, request, timeoutMs: 0 })
    ).rejects.toMatchObject({ statusCode: 504 });
    expect(runner.cancelWorkflowExecution).toHaveBeenCalledWith('exec-1', 'default', request);
  });

  it('cancels the execution when the workflow pauses for input', async () => {
    const runner = createRunner();
    runner.getWorkflowExecution.mockResolvedValue(execution(ExecutionStatus.WAITING_FOR_INPUT));

    await expect(
      createClient(runner).run({ workflowId: workflow.id, inputs: {}, request })
    ).rejects.toBeInstanceOf(GraphTraversalError);
    expect(runner.cancelWorkflowExecution).toHaveBeenCalled();
  });

  it('fails with 404 when the workflow is not installed', async () => {
    const runner = createRunner();
    runner.getWorkflow.mockResolvedValue(null);

    await expect(
      createClient(runner).run({ workflowId: workflow.id, inputs: {}, request })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(runner.runWorkflow).not.toHaveBeenCalled();
  });

  it('fails with 503 when workflows management is unavailable', async () => {
    await expect(
      createClient(undefined).run({ workflowId: workflow.id, inputs: {}, request })
    ).rejects.toMatchObject({ statusCode: 503 });
  });
});
