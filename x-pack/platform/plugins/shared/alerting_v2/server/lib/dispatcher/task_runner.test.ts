/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { DispatcherServiceContract } from './dispatcher';
import { DispatcherTaskRunner } from './task_runner';
import { createDispatcherPipelineInput } from './fixtures/test_utils';

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
    it('maps task state to dispatcher params', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
        pipelineResult: createMockPipelineResult(),
      });

      await runner.run({ taskInstance, signal });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.signal).toBe(signal);
      expect(params.eventWatermark?.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });

    it('returns updated eventWatermark in state', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
        pipelineResult: createMockPipelineResult(),
      });

      const result = await runner.run({ taskInstance, signal });

      expect(result).toEqual({
        state: {
          eventWatermark: '2026-01-22T07:45:00.000Z',
        },
      });
    });

    it('passes undefined eventWatermark when task state has no watermark (cold start)', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextWatermark: new Date('2026-01-22T07:45:00.000Z'),
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
    });
  });
});
