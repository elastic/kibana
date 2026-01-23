/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';

import { RuleExecutorTaskRunner } from './task_runner';
import type { RuleExecutionPipelineContract } from './execution_pipeline';
import { createRuleExecutionInput } from './test_utils';

describe('RuleExecutorTaskRunner', () => {
  // @ts-expect-error: not all fields are required
  const taskInstance: ConcreteTaskInstance = {
    id: 'task-1',
    params: { ruleId: 'rule-1', spaceId: 'default' },
    state: { foo: 'bar' },
    scheduledAt: new Date('2025-01-01T00:00:10.000Z'),
    startedAt: new Date('2025-01-01T00:00:10.000Z'),
  };

  const createMockPipeline = (): jest.Mocked<RuleExecutionPipelineContract> => ({
    execute: jest.fn(),
  });

  const createRunner = () => {
    const pipeline = createMockPipeline();
    const runner = new RuleExecutorTaskRunner(pipeline);
    return { runner, pipeline };
  };

  describe('extractExecutionInput', () => {
    it('constructs the pipeline input from task instance correctly', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: { input },
      });

      await runner.run({ taskInstance, abortController });

      expect(pipeline.execute).toHaveBeenCalledWith(input);
    });

    it('uses startedAt when scheduledAt is a string', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });

      const taskWithDateScheduledAt = {
        ...taskInstance,
        scheduledAt: '2025-01-01T00:00:00.000Z',
      };

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: {
          input,
        },
      });

      // @ts-expect-error: testing the scheduledAt as a string
      await runner.run({ taskInstance: taskWithDateScheduledAt, abortController });

      expect(pipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });
  });

  describe('buildRunResult', () => {
    it('returns empty state when pipeline completes successfully', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: { input },
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: {} });
    });

    it('preserves previous state when pipeline halts with rule_deleted', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });

      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_deleted',
        finalState: { input },
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: { foo: 'bar' } });
    });

    it('preserves previous state when pipeline halts with rule_disabled', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });

      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: { input },
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: { foo: 'bar' } }); // preserves taskInstance.state
    });

    it('returns empty state for unknown halt reasons', async () => {
      const { runner, pipeline } = createRunner();
      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });

      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: undefined,
        finalState: { input },
      });

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
