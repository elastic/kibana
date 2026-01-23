/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/task-manager-plugin/server/task';

import { RuleExecutorTaskRunner } from './task_runner';
import type { ExecutionPipelineContract, PipelineResult } from './execution_pipeline';
import type { RulePipelineState } from './types';

describe('RuleExecutorTaskRunner', () => {
  const taskInstance = {
    id: 'task-1',
    params: { ruleId: 'rule-1', spaceId: 'default' },
    state: { foo: 'bar' },
    scheduledAt: '2025-01-01T00:00:00.000Z',
    startedAt: new Date('2025-01-01T00:00:10.000Z'),
  } as unknown as RunContext['taskInstance'];

  const createMockPipeline = (): jest.Mocked<ExecutionPipelineContract> => ({
    execute: jest.fn(),
  });

  const createRunner = () => {
    const pipeline = createMockPipeline();
    const runner = new RuleExecutorTaskRunner(pipeline as any);
    return { runner, pipeline };
  };

  describe('extractExecutionInput', () => {
    it('extracts domain input from task instance', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();

      const basePipelineState: RulePipelineState = {
        input: {
          ruleId: 'rule-1',
          spaceId: 'default',
          scheduledAt: '2025-01-01T00:00:00.000Z',
          abortSignal: abortController.signal,
        },
      };

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: basePipelineState,
      });

      await runner.run({ taskInstance, abortController });

      expect(pipeline.execute).toHaveBeenCalledWith({
        ruleId: 'rule-1',
        spaceId: 'default',
        scheduledAt: '2025-01-01T00:00:00.000Z',
        abortSignal: abortController.signal,
      });
    });

    it('uses startedAt when scheduledAt is not a string', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();

      const taskWithDateScheduledAt = {
        ...taskInstance,
        scheduledAt: new Date('2025-01-01T00:00:00.000Z'),
      } as unknown as RunContext['taskInstance'];

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: { input: expect.anything() },
      });

      await runner.run({ taskInstance: taskWithDateScheduledAt, abortController });

      expect(pipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: '2025-01-01T00:00:10.000Z', // startedAt is used
        })
      );
    });
  });

  describe('buildRunResult', () => {
    it('returns empty state when pipeline completes successfully', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: { input: expect.anything() },
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: {} });
    });

    it('preserves previous state when pipeline halts with rule_deleted', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();

      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_deleted',
        finalState: { input: expect.anything() },
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: { foo: 'bar' } }); // preserves taskInstance.state
    });

    it('preserves previous state when pipeline halts with rule_disabled', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();

      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: { input: expect.anything() },
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: { foo: 'bar' } }); // preserves taskInstance.state
    });

    it('returns empty state for unknown halt reasons', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();

      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: undefined,
        finalState: { input: expect.anything() },
      } as PipelineResult);

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: {} });
    });
  });

  describe('error handling', () => {
    it('propagates pipeline errors', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const error = new Error('Pipeline failed');

      pipeline.execute.mockRejectedValue(error);

      await expect(runner.run({ taskInstance, abortController })).rejects.toThrow(
        'Pipeline failed'
      );
    });
  });
});
