/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { isUnrecoverableError } from '@kbn/task-manager-plugin/server';

import { RuleExecutorTaskRunner } from './task_runner';
import type { RuleExecutionPipelineContract } from './execution_pipeline';
import { createRulePipelineState } from './test_utils';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { RuleExecutionMetricsSnapshot } from './metrics/types';
import { tagFailedStep, RULE_EXECUTION_FAILURE_REASONS } from './execution_outcome';
import { RULE_EXECUTION_COUNTERS } from './metrics/counters';
import { RuleExecutionCancellationError } from '../execution_context';

const createEmptyMetricsSnapshot = (
  counters: Record<string, number> = {}
): RuleExecutionMetricsSnapshot => ({
  executionId: 'execution-uuid',
  startedAt: '2025-01-01T00:00:00.000Z',
  endedAt: '2025-01-01T00:00:00.001Z',
  durationMs: 1,
  counters,
});

type TaskRunParams = Parameters<RuleExecutorTaskRunner['run']>[0];

describe('RuleExecutorTaskRunner', () => {
  let runner: RuleExecutorTaskRunner;
  let pipeline: jest.Mocked<RuleExecutionPipelineContract>;
  let signal: AbortSignal;
  let mockLoggerService: ReturnType<typeof createLoggerService>;
  let setCustomTaskRunEventFields: jest.Mock;

  const executionUuid = 'execution-uuid';

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
    mockLoggerService = createLoggerService();
    runner = new RuleExecutorTaskRunner(pipeline, mockLoggerService.loggerService);
    signal = new AbortController().signal;
    setCustomTaskRunEventFields = jest.fn();
  });

  const runTask = (overrides: Partial<TaskRunParams> = {}) =>
    runner.run({ taskInstance, signal, executionUuid, setCustomTaskRunEventFields, ...overrides });

  describe('extractExecutionInput', () => {
    it('constructs the pipeline input from task instance correctly', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      await runTask();

      expect(pipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-1',
          spaceId: asSpaceId('default'),
          scheduledAt: taskInstance.scheduledAt?.toISOString(),
          abortSignal: signal,
          executionUuid,
        })
      );
      const executeArg = pipeline.execute.mock.calls[0][0];
      expect(executeArg.logger).toBeDefined();
      executeArg.logger.debug({ message: 'probe' });
      expect(mockLoggerService.mockLogger.debug).toHaveBeenCalledWith('probe', {
        labels: {
          rule_id: 'rule-1',
          space_id: 'default',
          task_id: 'task-1',
          execution_id: executionUuid,
        },
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
        metrics: createEmptyMetricsSnapshot(),
      });

      // @ts-expect-error: testing the scheduledAt as a string
      await runTask({ taskInstance: taskWithDateScheduledAt });

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
        metrics: createEmptyMetricsSnapshot(),
      });

      const result = await runTask();

      expect(result).toEqual({ state: {} });
    });

    it('throws an unrecoverable error and logs a warning when pipeline halts with rule_deleted', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_deleted',
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      const result = await runTask().catch((error) => error);

      expect(result).toBeInstanceOf(Error);
      expect(isUnrecoverableError(result)).toBe(true);
    });

    it('preserves previous state when pipeline halts with rule_disabled', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      const result = await runTask();

      expect(result).toEqual({ state: { foo: 'bar' } });
    });

    it('does not throw an unrecoverable error when pipeline completes', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      await expect(runTask()).resolves.toEqual({ state: {} });
    });

    it('returns empty state for unknown halt reasons', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: undefined,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      const result = await runTask();

      expect(result).toEqual({ state: {} });
    });
  });

  describe('status', () => {
    const expectStatus = (status: string) =>
      expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(expect.objectContaining({ status }));

    it('reports success when the pipeline completes without dropping work', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot({
          [RULE_EXECUTION_COUNTERS.signalsGenerated]: 3,
          [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 12,
        }),
      });

      await runTask();

      expectStatus('success');
    });

    it.each([
      RULE_EXECUTION_COUNTERS.groupsDroppedByLimit,
      RULE_EXECUTION_COUNTERS.rowsDroppedByLimit,
    ])('reports warning when %s is above zero', async (counter) => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot({ [counter]: 1 }),
      });

      await runTask();

      expectStatus('warning');
    });

    it.each([
      RULE_EXECUTION_COUNTERS.groupsDroppedByLimit,
      RULE_EXECUTION_COUNTERS.rowsDroppedByLimit,
    ])('stays on success when %s is present but zero', async (counter) => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot({ [counter]: 0 }),
      });

      await runTask();

      expectStatus('success');
    });

    it.each(['rule_disabled', 'state_not_ready', 'rule_deleted'] as const)(
      'reports skipped rather than failed when the pipeline halts with %s',
      async (haltReason) => {
        pipeline.execute.mockResolvedValue({
          completed: false,
          haltReason,
          finalState: createRulePipelineState(),
          metrics: createEmptyMetricsSnapshot(),
        });

        // `rule_deleted` disposes of the task by throwing, after the fields are set.
        await runTask().catch(() => undefined);

        expectStatus('skipped');
      }
    );

    it('reports skipped for a halt that carries no reason', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: undefined,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      await runTask();

      expectStatus('skipped');
    });

    it('does not downgrade a halt to warning when work was also dropped', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot({
          [RULE_EXECUTION_COUNTERS.rowsDroppedByLimit]: 5,
        }),
      });

      await runTask();

      expectStatus('skipped');
    });
  });

  describe('error handling', () => {
    it('propagates pipeline errors', async () => {
      pipeline.execute.mockRejectedValue(new Error('Pipeline failed'));

      await expect(runTask()).rejects.toThrow('Pipeline failed');
    });

    it('reports the failing step as the reason on the task-run event', async () => {
      pipeline.execute.mockRejectedValue(
        tagFailedStep(new Error('Pipeline failed'), 'execute_rule_query')
      );

      await expect(runTask()).rejects.toThrow('Pipeline failed');

      expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          reason: 'execute_rule_query',
          'rule.id': 'rule-1',
          'rule.spaceId': 'default',
        })
      );
    });

    it('reports a timeout status and cancelled_timeout for cancellation errors', async () => {
      pipeline.execute.mockRejectedValue(
        tagFailedStep(new RuleExecutionCancellationError(), 'execute_rule_query')
      );

      await expect(runTask()).rejects.toThrow();

      expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'timeout',
          reason: RULE_EXECUTION_FAILURE_REASONS.CANCELLED_TIMEOUT,
        })
      );
    });

    it('omits the reason when the error carries no step tag', async () => {
      pipeline.execute.mockRejectedValue(new Error('Pipeline failed'));

      await expect(runTask()).rejects.toThrow('Pipeline failed');

      expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(
        expect.not.objectContaining({ reason: expect.anything() })
      );
    });

    it('reports the halt reason when the pipeline stops cleanly', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_disabled',
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      await runTask();

      expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'skipped', reason: 'rule_disabled' })
      );
    });

    it('omits the reason on a successful run', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
        metrics: createEmptyMetricsSnapshot(),
      });

      await runTask();

      expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(
        expect.not.objectContaining({ reason: expect.anything() })
      );
    });
  });
});
