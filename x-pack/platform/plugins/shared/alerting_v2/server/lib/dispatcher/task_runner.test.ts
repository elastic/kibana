/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { DispatcherServiceContract } from './dispatcher';
import { createDispatcherPipelineInput } from './fixtures/test_utils';
import { DispatcherTaskRunner } from './task_runner';

const createMockPipelineResult = () => ({
  completed: true,
  finalState: { input: createDispatcherPipelineInput() },
});

describe('DispatcherTaskRunner', () => {
  let dispatcherService: jest.Mocked<DispatcherServiceContract>;
  let runner: DispatcherTaskRunner;
  let signal: AbortSignal;

  // @ts-expect-error: not all fields are required for these tests
  const taskInstance: ConcreteTaskInstance = {
    id: 'task-1',
    params: {},
    state: {
      eventWatermark: '2026-01-22T07:30:00.000Z',
    },
    scheduledAt: new Date('2026-01-22T07:30:00.000Z'),
    startedAt: new Date('2026-01-22T07:30:00.000Z'),
  };

  beforeEach(() => {
    dispatcherService = { run: jest.fn() };
    runner = new DispatcherTaskRunner(dispatcherService);
    signal = new AbortController().signal;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('maps task state to dispatcher params (eventWatermark + stuckTicks)', async () => {
      const instanceWithStuckTicks: ConcreteTaskInstance = {
        ...taskInstance,
        state: { eventWatermark: '2026-01-22T07:30:00.000Z', stuckTicks: 3 },
      };

      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
        nextStuckTicks: 0,
        pipelineResult: createMockPipelineResult(),
      });

      await runner.run({ taskInstance: instanceWithStuckTicks, signal });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.signal).toBe(signal);
      expect(params.eventWatermark?.toISOString()).toBe('2026-01-22T07:30:00.000Z');
      expect(params.stuckTicks).toBe(3);
    });

    it('defaults stuckTicks to 0 when absent from task state', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
        nextStuckTicks: 0,
        pipelineResult: createMockPipelineResult(),
      });

      await runner.run({ taskInstance, signal });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.stuckTicks).toBe(0);
      expect(params.signal).toBe(signal);
      expect(params.taskId).toBe(taskInstance.id);
    });

    it('returns updated eventWatermark and stuckTicks in state', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
        nextStuckTicks: 2,
        pipelineResult: createMockPipelineResult(),
      });

      const result = await runner.run({ taskInstance, signal });

      expect(result).toEqual({
        state: {
          eventWatermark: '2026-01-22T07:45:00.000Z',
          stuckTicks: 2,
        },
      });
    });

    it('passes undefined eventWatermark when task state has no watermark (cold start)', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
        nextStuckTicks: 0,
        pipelineResult: createMockPipelineResult(),
      });

      // @ts-expect-error: not all fields are required for these tests
      const emptyStateInstance: ConcreteTaskInstance = {
        id: 'task-1',
        params: {},
        state: {},
        scheduledAt: new Date('2026-01-22T07:30:00.000Z'),
        startedAt: new Date('2026-01-22T07:30:00.000Z'),
      };

      await runner.run({ taskInstance: emptyStateInstance, signal });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.eventWatermark).toBeUndefined();
      expect(params.stuckTicks).toBe(0);
    });
  });
});
