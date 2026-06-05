/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { SigEventsWorkflowStatus } from '@kbn/streams-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionService } from './workflow_execution_service';

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => ({
  getWorkflow: jest.fn().mockResolvedValue({
    id: 'wf-1',
    name: 'workflow',
    enabled: true,
    definition: {},
    yaml: '',
  }),
  runWorkflow: jest.fn().mockResolvedValue('execution-id'),
  getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
  getWorkflowExecution: jest.fn().mockResolvedValue(null),
  cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createService = (overrides: Record<string, jest.Mock> = {}) => {
  const managementApi = createMockManagementApi(overrides);
  const service = new WorkflowExecutionService({ managementApi: managementApi as never });
  return { service, managementApi };
};

describe('WorkflowExecutionService', () => {
  describe('classifyExecutionStatus', () => {
    it.each([
      [ExecutionStatus.PENDING, SigEventsWorkflowStatus.InProgress],
      [ExecutionStatus.RUNNING, SigEventsWorkflowStatus.InProgress],
      [ExecutionStatus.WAITING, SigEventsWorkflowStatus.InProgress],
      [ExecutionStatus.WAITING_FOR_INPUT, SigEventsWorkflowStatus.InProgress],
      [ExecutionStatus.WAITING_FOR_CHILD, SigEventsWorkflowStatus.InProgress],
      [ExecutionStatus.COMPLETED, SigEventsWorkflowStatus.Completed],
      [ExecutionStatus.FAILED, SigEventsWorkflowStatus.Failed],
      [ExecutionStatus.TIMED_OUT, SigEventsWorkflowStatus.Failed],
      [ExecutionStatus.CANCELLED, SigEventsWorkflowStatus.Canceled],
      [ExecutionStatus.SKIPPED, SigEventsWorkflowStatus.Canceled],
    ])('maps %s to %s', (executionStatus, expected) => {
      expect(WorkflowExecutionService.classifyExecutionStatus(executionStatus)).toBe(expected);
    });
  });

  describe('getFailureMessage', () => {
    it('returns the provided timeout message for TIMED_OUT executions', () => {
      expect(
        WorkflowExecutionService.getFailureMessage(
          { status: ExecutionStatus.TIMED_OUT, error: { message: 'ignored' } } as never,
          'It timed out'
        )
      ).toBe('It timed out');
    });

    it('returns the execution error message for non-timeout failures', () => {
      expect(
        WorkflowExecutionService.getFailureMessage(
          { status: ExecutionStatus.FAILED, error: { message: 'boom' } } as never,
          'It timed out'
        )
      ).toBe('boom');
    });

    it('falls back to "Unknown error" when no error message is present', () => {
      expect(
        WorkflowExecutionService.getFailureMessage(
          { status: ExecutionStatus.FAILED } as never,
          'It timed out'
        )
      ).toBe('Unknown error');
    });
  });

  describe('execute', () => {
    it('fetches the definition from the global space and runs it in the execution space', async () => {
      const { service, managementApi } = createService();
      const request = httpServerMock.createKibanaRequest();

      const executionId = await service.execute({
        workflowId: 'wf-1',
        executionSpaceId: 'space-a',
        inputs: { foo: 'bar' },
        request,
      });

      expect(executionId).toBe('execution-id');
      expect(managementApi.getWorkflow).toHaveBeenCalledWith('wf-1', '*');
      expect(managementApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'wf-1' }),
        'space-a',
        { foo: 'bar' },
        request
      );
    });

    it('throws when the workflow is not found', async () => {
      const { service } = createService({ getWorkflow: jest.fn().mockResolvedValue(null) });

      await expect(
        service.execute({
          workflowId: 'wf-1',
          executionSpaceId: 'space-a',
          inputs: {},
          request: httpServerMock.createKibanaRequest(),
        })
      ).rejects.toThrow(/Workflow wf-1 not found/);
    });

    it('throws when the workflow has no definition', async () => {
      const { service } = createService({
        getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1', definition: null }),
      });

      await expect(
        service.execute({
          workflowId: 'wf-1',
          executionSpaceId: 'space-a',
          inputs: {},
          request: httpServerMock.createKibanaRequest(),
        })
      ).rejects.toThrow(/Workflow wf-1 not found/);
    });

    it('throws the caller-supplied message when the workflow is not found', async () => {
      const { service } = createService({ getWorkflow: jest.fn().mockResolvedValue(null) });

      await expect(
        service.execute({
          workflowId: 'wf-1',
          executionSpaceId: 'space-a',
          inputs: {},
          request: httpServerMock.createKibanaRequest(),
          notFoundMessage: 'Onboarding workflow wf-1 not found',
        })
      ).rejects.toThrow(/Onboarding workflow wf-1 not found/);
    });
  });

  describe('cancelLatest', () => {
    it('cancels the latest non-terminal execution and returns its id', async () => {
      const { service, managementApi } = createService({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }] }),
      });
      const request = httpServerMock.createKibanaRequest();

      const result = await service.cancelLatest({
        workflowId: 'wf-1',
        spaceId: 'space-a',
        request,
      });

      expect(result).toBe('exec-1');
      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-1',
        'space-a',
        request
      );
    });

    it('returns null and does not cancel when the latest execution is terminal', async () => {
      const { service, managementApi } = createService({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'exec-1', status: ExecutionStatus.COMPLETED }] }),
      });

      const result = await service.cancelLatest({
        workflowId: 'wf-1',
        spaceId: 'space-a',
        request: httpServerMock.createKibanaRequest(),
      });

      expect(result).toBeNull();
      expect(managementApi.cancelWorkflowExecution).not.toHaveBeenCalled();
    });

    it('returns null when there are no executions', async () => {
      const { service } = createService();

      const result = await service.cancelLatest({
        workflowId: 'wf-1',
        spaceId: 'space-a',
        request: httpServerMock.createKibanaRequest(),
      });

      expect(result).toBeNull();
    });

    it('forwards the concurrency group key when provided', async () => {
      const { service, managementApi } = createService();

      await service.cancelLatest({
        workflowId: 'wf-1',
        spaceId: 'space-a',
        request: httpServerMock.createKibanaRequest(),
        concurrencyGroupKey: 'group-1',
      });

      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'wf-1', concurrencyGroupKey: 'group-1', size: 1 }),
        'space-a'
      );
    });
  });
});
