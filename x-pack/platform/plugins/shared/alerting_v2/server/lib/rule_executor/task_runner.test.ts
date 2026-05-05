/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';

import { RuleExecutorTaskRunner } from './task_runner';
import type { RuleExecutionPipelineContract } from './execution_pipeline';
import { createRulePipelineState } from './test_utils';
import { createEventLogService } from '../services/event_log_service/event_log_service.mock';
import type { RuleResponse } from '../rules_client';

describe('RuleExecutorTaskRunner', () => {
  let runner: RuleExecutorTaskRunner;
  let pipeline: jest.Mocked<RuleExecutionPipelineContract>;
  let abortController: AbortController;
  let mockEventLogger: ReturnType<typeof createEventLogService>['mockEventLogger'];

  // @ts-expect-error: not all fields are required
  const taskInstance: ConcreteTaskInstance = {
    id: 'task-1',
    params: { ruleId: 'rule-1', spaceId: 'default' },
    state: { foo: 'bar' },
    scheduledAt: new Date('2025-01-01T00:00:10.000Z'),
    startedAt: new Date('2025-01-01T00:00:10.000Z'),
  };

  const sampleRule = {
    id: 'rule-1',
    kind: 'alert',
    metadata: { name: 'Sample rule', tags: ['production', 'infra'] },
  } as unknown as RuleResponse;

  beforeEach(() => {
    pipeline = { execute: jest.fn() };
    const services = createEventLogService();
    mockEventLogger = services.mockEventLogger;
    runner = new RuleExecutorTaskRunner(pipeline, services.eventLogService);
    abortController = new AbortController();
  });

  describe('extractExecutionInput', () => {
    it('constructs the pipeline input from task instance and generates an executionUuid', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
      });

      await runner.run({ taskInstance, abortController });

      expect(pipeline.execute).toHaveBeenCalledWith({
        ruleId: 'rule-1',
        spaceId: 'default',
        scheduledAt: taskInstance.scheduledAt?.toISOString(),
        abortSignal: abortController.signal,
        executionUuid: expect.any(String),
        metrics: expect.any(Object),
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

    it('preserves previous state when pipeline halts with rule_deleted', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_deleted',
        finalState: createRulePipelineState(),
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({ state: { foo: 'bar' } });
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

  describe('event log emission', () => {
    it('emits one execute-start and one execute on a successful run sharing the same execution.uuid', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState({ rule: sampleRule }),
      });

      await runner.run({ taskInstance, abortController });

      expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(2);

      const [startCall, summaryCall] = mockEventLogger.logEvent.mock.calls;
      const startEvent = startCall[0];
      const summaryEvent = summaryCall[0];

      expect(startEvent?.event?.action).toBe('execute-start');
      expect(summaryEvent?.event?.action).toBe('execute');
      expect(summaryEvent?.event?.outcome).toBe('success');

      const startUuid = startEvent?.kibana?.alerting_v2?.rule_executor?.execution?.uuid;
      const summaryUuid = summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.uuid;
      expect(startUuid).toBeDefined();
      expect(summaryUuid).toBe(startUuid);

      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('success');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.rule?.name).toBe('Sample rule');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.rule?.kind).toBe('alert');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.rule?.tags).toEqual([
        'production',
        'infra',
      ]);
    });

    it('emits a failed execute when the pipeline halts with rule_deleted', async () => {
      pipeline.execute.mockResolvedValue({
        completed: false,
        haltReason: 'rule_deleted',
        finalState: createRulePipelineState(),
      });

      await runner.run({ taskInstance, abortController });

      const summaryEvent = mockEventLogger.logEvent.mock.calls[1][0];
      expect(summaryEvent?.event?.outcome).toBe('failure');
      expect(summaryEvent?.event?.reason).toBe('rule_deleted');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('failed');
    });

    it('emits a failed execute when the pipeline throws', async () => {
      pipeline.execute.mockRejectedValue(new Error('boom'));

      await expect(runner.run({ taskInstance, abortController })).rejects.toThrow('boom');

      expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(2);
      const summaryEvent = mockEventLogger.logEvent.mock.calls[1][0];
      expect(summaryEvent?.event?.outcome).toBe('failure');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('failed');
      expect(summaryEvent?.error?.message).toBe('boom');
      // No step tag on the error → reason left undefined
      expect(summaryEvent?.event?.reason).toBeUndefined();
    });

    it.each([
      ['execute_rule_query', 'query_failed'],
      ['create_recovery_events', 'recovery_query_failed'],
      ['store_alert_events', 'store_failed'],
      ['director', 'director_failed'],
    ] as Array<[string, string]>)(
      'maps a tagged error from %s to reason %s',
      async (stepName, reason) => {
        const tagged = new Error('step failed');
        Object.defineProperty(tagged, '__alertingV2RuleExecutorStepName', {
          value: stepName,
          enumerable: false,
        });
        pipeline.execute.mockRejectedValue(tagged);

        await expect(runner.run({ taskInstance, abortController })).rejects.toThrow('step failed');

        const summaryEvent = mockEventLogger.logEvent.mock.calls[1][0];
        expect(summaryEvent?.event?.outcome).toBe('failure');
        expect(summaryEvent?.event?.reason).toBe(reason);
        expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('failed');
      }
    );

    it('leaves reason undefined for tagged errors from non-mappable steps', async () => {
      const tagged = new Error('fetch failed');
      Object.defineProperty(tagged, '__alertingV2RuleExecutorStepName', {
        value: 'fetch_rule',
        enumerable: false,
      });
      pipeline.execute.mockRejectedValue(tagged);

      await expect(runner.run({ taskInstance, abortController })).rejects.toThrow('fetch failed');

      const summaryEvent = mockEventLogger.logEvent.mock.calls[1][0];
      expect(summaryEvent?.event?.outcome).toBe('failure');
      expect(summaryEvent?.event?.reason).toBeUndefined();
    });

    it('emits a timeout execute when the pipeline throws after the abort signal fires', async () => {
      pipeline.execute.mockImplementation(async () => {
        abortController.abort();
        throw new Error('cancelled');
      });

      await expect(runner.run({ taskInstance, abortController })).rejects.toThrow('cancelled');

      const summaryEvent = mockEventLogger.logEvent.mock.calls[1][0];
      expect(summaryEvent?.event?.outcome).toBe('failure');
      expect(summaryEvent?.event?.reason).toBe('cancelled_timeout');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('timeout');
      expect(summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.cancelled?.reason).toBe(
        'timeout'
      );
    });

    it('populates total_run_duration_ms on the execute summary', async () => {
      pipeline.execute.mockResolvedValue({
        completed: true,
        finalState: createRulePipelineState(),
      });

      await runner.run({ taskInstance, abortController });

      const summaryEvent = mockEventLogger.logEvent.mock.calls[1][0];
      const duration =
        summaryEvent?.kibana?.alerting_v2?.rule_executor?.execution?.metrics?.total_run_duration_ms;
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
