/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BackgroundExecutionService } from './background_execution_service';
import type { SubAgentExecutor } from '@kbn/agent-builder-server';
import { ExecutionStatus } from '@kbn/agent-builder-common';

const createMockExecutor = (overrides: Partial<SubAgentExecutor> = {}): SubAgentExecutor => ({
  executeSubAgent: jest.fn(),
  getExecution: jest.fn(),
  ...overrides,
});

describe('BackgroundExecutionService', () => {
  describe('registerExecution', () => {
    it('adds a new pending execution', () => {
      const service = new BackgroundExecutionService({ subAgentExecutor: createMockExecutor() });
      service.registerExecution('exec-1');

      const state = service.getState();
      expect(state['exec-1']).toEqual({
        execution_id: 'exec-1',
        status: ExecutionStatus.running,
      });
    });
  });

  describe('checkForCompletions', () => {
    it('updates state when execution completes', async () => {
      const executor = createMockExecutor({
        getExecution: jest.fn().mockResolvedValue({
          executionId: 'exec-1',
          status: ExecutionStatus.completed,
          events: [
            {
              type: 'round_complete',
              data: { round: { response: { message: 'done' } } },
            },
          ],
        }),
      });

      const service = new BackgroundExecutionService({
        subAgentExecutor: executor,
        initialState: {
          'exec-1': { execution_id: 'exec-1', status: ExecutionStatus.running },
        },
      });

      const completions = await service.checkForCompletions({ roundId: 'round-1' });

      expect(completions).toHaveLength(1);
      expect(completions[0].execution_id).toBe('exec-1');
      expect(completions[0].status).toBe(ExecutionStatus.completed);
      expect(completions[0].response).toEqual({ message: 'done' });
      expect(completions[0].completed_at?.round_id).toBe('round-1');
    });

    it('does not re-check already completed executions', async () => {
      const executor = createMockExecutor({ getExecution: jest.fn() });

      const service = new BackgroundExecutionService({
        subAgentExecutor: executor,
        initialState: {
          'exec-1': {
            execution_id: 'exec-1',
            status: ExecutionStatus.completed,
            response: { message: 'done' },
            completed_at: { round_id: 'round-0' },
          },
        },
      });

      const completions = await service.checkForCompletions({ roundId: 'round-1' });

      expect(completions).toHaveLength(0);
      expect(executor.getExecution).not.toHaveBeenCalled();
    });

    it('updates state when execution fails', async () => {
      const executor = createMockExecutor({
        getExecution: jest.fn().mockResolvedValue({
          executionId: 'exec-1',
          status: ExecutionStatus.failed,
          error: { code: 'internal_error', message: 'LLM timeout' },
          events: [],
        }),
      });

      const service = new BackgroundExecutionService({
        subAgentExecutor: executor,
        initialState: {
          'exec-1': { execution_id: 'exec-1', status: ExecutionStatus.running },
        },
      });

      const completions = await service.checkForCompletions({ roundId: 'round-1' });

      expect(completions).toHaveLength(1);
      expect(completions[0].status).toBe(ExecutionStatus.failed);
      expect(completions[0].error).toEqual({ code: 'internal_error', message: 'LLM timeout' });
    });

    it('returns empty when no pending executions', async () => {
      const service = new BackgroundExecutionService({ subAgentExecutor: createMockExecutor() });

      const completions = await service.checkForCompletions({ roundId: 'round-1' });
      expect(completions).toHaveLength(0);
    });

    it('sets toolCallGroupId on completed_at when provided', async () => {
      const executor = createMockExecutor({
        getExecution: jest.fn().mockResolvedValue({
          executionId: 'exec-1',
          status: ExecutionStatus.completed,
          events: [
            {
              type: 'round_complete',
              data: { round: { response: { message: 'done' } } },
            },
          ],
        }),
      });

      const service = new BackgroundExecutionService({
        subAgentExecutor: executor,
        initialState: {
          'exec-1': { execution_id: 'exec-1', status: ExecutionStatus.running },
        },
      });

      const completions = await service.checkForCompletions({
        roundId: 'round-1',
        toolCallGroupId: 'group-abc',
      });

      expect(completions[0].completed_at).toEqual({
        round_id: 'round-1',
        tool_call_group_id: 'group-abc',
      });
    });
  });

  describe('hasPending', () => {
    it('returns true when there are running executions', () => {
      const service = new BackgroundExecutionService({
        subAgentExecutor: createMockExecutor(),
        initialState: {
          'exec-1': { execution_id: 'exec-1', status: ExecutionStatus.running },
        },
      });
      expect(service.hasPending()).toBe(true);
    });

    it('returns false when all executions are terminal', () => {
      const service = new BackgroundExecutionService({
        subAgentExecutor: createMockExecutor(),
        initialState: {
          'exec-1': {
            execution_id: 'exec-1',
            status: ExecutionStatus.completed,
            completed_at: { round_id: 'r1' },
          },
        },
      });
      expect(service.hasPending()).toBe(false);
    });
  });

  describe('getPendingState', () => {
    it('returns only non-terminal executions', () => {
      const service = new BackgroundExecutionService({
        subAgentExecutor: createMockExecutor(),
        initialState: {
          'exec-1': { execution_id: 'exec-1', status: ExecutionStatus.running },
          'exec-2': {
            execution_id: 'exec-2',
            status: ExecutionStatus.completed,
            completed_at: { round_id: 'r1' },
          },
          'exec-3': { execution_id: 'exec-3', status: ExecutionStatus.running },
        },
      });

      const pending = service.getPendingState();
      expect(Object.keys(pending)).toEqual(['exec-1', 'exec-3']);
    });

    it('returns empty object when all executions are terminal', () => {
      const service = new BackgroundExecutionService({
        subAgentExecutor: createMockExecutor(),
        initialState: {
          'exec-1': {
            execution_id: 'exec-1',
            status: ExecutionStatus.completed,
            completed_at: { round_id: 'r1' },
          },
        },
      });

      const pending = service.getPendingState();
      expect(Object.keys(pending)).toHaveLength(0);
    });
  });
});
