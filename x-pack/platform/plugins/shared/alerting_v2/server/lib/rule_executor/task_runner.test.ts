/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { isUnrecoverableError } from '@kbn/task-manager-plugin/server';

import { RuleExecutorTaskRunner } from './task_runner';
import type { RuleExecutionPipeline } from './execution_pipeline';
import type { RuleExecutionObserverHub } from './events';
import { createRulePipelineState } from './test_utils';
import { createLoggerService } from '../services/logger_service/logger_service.mock';

describe('RuleExecutorTaskRunner', () => {
  let runner: RuleExecutorTaskRunner;
  let pipeline: jest.Mocked<Pick<RuleExecutionPipeline, 'execute'>>;
  let observerHub: jest.Mocked<Pick<RuleExecutionObserverHub, 'emit'>>;
  let abortController: AbortController;

  // @ts-expect-error: not all fields are required
  const taskInstance: ConcreteTaskInstance = {
    id: 'task-1',
    params: { ruleId: 'rule-1', spaceId: 'default' },
    state: { foo: 'bar' },
    scheduledAt: new Date('2025-01-01T00:00:10.000Z'),
    startedAt: new Date('2025-01-01T00:00:10.000Z'),
  };

  beforeEach(() => {
    pipeline = { execute: jest.fn() };
    observerHub = { emit: jest.fn() };
    const mockLoggerService = createLoggerService();
    runner = new RuleExecutorTaskRunner(
      pipeline as unknown as RuleExecutionPipeline,
      observerHub as unknown as RuleExecutionObserverHub,
      mockLoggerService.loggerService
    );
    abortController = new AbortController();
  });

  describe('extractExecutionInput', () => {
    it('constructs the pipeline input from task instance correctly', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
      });

      await runner.run({ taskInstance, abortController });

      expect(pipeline.execute).toHaveBeenCalledWith({
        ruleId: 'rule-1',
        spaceId: 'default',
        scheduledAt: taskInstance.scheduledAt?.toISOString(),
        executionUuid: expect.any(String),
        abortSignal: abortController.signal,
      });
    });

    it('uses startedAt when scheduledAt is a string', async () => {
      const taskWithDateScheduledAt = {
        ...taskInstance,
        scheduledAt: '2025-01-01T00:00:00.000Z',
      };

      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
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
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: {} });
    });

    it('throws an unrecoverable error and logs a warning when pipeline halts with rule_deleted', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_deleted',
        finalState: createRulePipelineState(),
      });

      const result = await runner.run({ taskInstance, abortController }).catch((error) => error);

      expect(result).toBeInstanceOf(Error);
      expect(isUnrecoverableError(result)).toBe(true);
    });

    it('preserves previous state when pipeline halts with rule_disabled', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: createRulePipelineState(),
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: { foo: 'bar' } });
    });

    it('does not throw an unrecoverable error when pipeline completes', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
      });

      await expect(runner.run({ taskInstance, abortController })).resolves.toEqual({ state: {} });
    });

    it('returns empty state for unknown halt reasons', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: undefined,
        finalState: createRulePipelineState(),
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: {} });
    });
  });

  describe('error handling', () => {
    it('propagates pipeline errors', async () => {
      pipeline.execute.mockRejectedValue(new Error('Pipeline failed'));

      await expect(runner.run({ taskInstance, abortController })).rejects.toThrow(
        'Pipeline failed'
      );
    });
  });

  describe('observer events', () => {
    it('emits execution_started before invoking the pipeline and execution_completed after success', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
      });

      await runner.run({ taskInstance, abortController });

      expect(observerHub.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'execution_started',
          ruleId: 'rule-1',
          spaceId: 'default',
        })
      );
      expect(observerHub.emit).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'execution_completed', haltReason: undefined })
      );
    });

    it('emits execution_completed with haltReason when the pipeline halts', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: createRulePipelineState(),
      });

      await runner.run({ taskInstance, abortController });

      expect(observerHub.emit).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'execution_completed', haltReason: 'rule_disabled' })
      );
    });

    it('emits execution_failed when the pipeline rejects with a generic error', async () => {
      pipeline.execute.mockRejectedValue(new Error('boom'));

      await runner.run({ taskInstance, abortController }).catch(() => undefined);

      expect(observerHub.emit).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'execution_failed' })
      );
    });
  });
});
