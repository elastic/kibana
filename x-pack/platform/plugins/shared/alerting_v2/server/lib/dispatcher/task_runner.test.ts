/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { DispatcherServiceContract } from './dispatcher';
import type { DispatcherEnabledProvider } from './tokens';
import { DispatcherTaskRunner } from './task_runner';
import type { DispatcherExecutionResult } from './types';

function stubExecutionResult(
  startedAt: Date,
  overrides: Partial<DispatcherExecutionResult> = {}
): DispatcherExecutionResult {
  return {
    startedAt,
    tick: {
      started_at: startedAt.toISOString(),
      finished_at: startedAt.toISOString(),
      duration_ms: 0,
      previous_started_at: startedAt.toISOString(),
      completed: true,
      halt_reason: null,
      stages: [],
      totals: {
        episodes: 0,
        suppressions: 0,
        dispatchable: 0,
        suppressed: 0,
        rules: 0,
        policies: 0,
        matched: 0,
        groups: 0,
        dispatch: 0,
        throttled: 0,
      },
    },
    ...overrides,
  };
}

describe('DispatcherTaskRunner', () => {
  let dispatcherService: jest.Mocked<DispatcherServiceContract>;
  let dispatcherEnabledProvider: jest.MockedFunction<DispatcherEnabledProvider>;
  let runner: DispatcherTaskRunner;
  let abortController: AbortController;

  // @ts-expect-error: not all fields are required for these tests
  const taskInstance: ConcreteTaskInstance = {
    id: 'task-1',
    params: {},
    state: {
      previousStartedAt: '2026-01-22T07:30:00.000Z',
    },
    scheduledAt: new Date('2026-01-22T07:30:00.000Z'),
    startedAt: new Date('2026-01-22T07:30:00.000Z'),
  };

  beforeEach(() => {
    dispatcherService = { run: jest.fn() };
    dispatcherEnabledProvider = jest.fn().mockResolvedValue(true);
    runner = new DispatcherTaskRunner(dispatcherService, dispatcherEnabledProvider);
    abortController = new AbortController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('maps task state to dispatcher params', async () => {
      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      await runner.run({ taskInstance, abortController });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.abortController).toBe(abortController);
      expect(params.previousStartedAt?.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });

    it('passes the persisted eventWatermark to the dispatcher as a Date', async () => {
      const taskInstanceWithWatermark = {
        ...taskInstance,
        state: {
          previousStartedAt: '2026-01-22T07:30:00.000Z',
          eventWatermark: '2026-01-22T07:29:00.000Z',
        },
      };

      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      await runner.run({ taskInstance: taskInstanceWithWatermark, abortController });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.eventWatermark?.toISOString()).toBe('2026-01-22T07:29:00.000Z');
    });

    it('omits eventWatermark from dispatcher params when state has none', async () => {
      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      await runner.run({ taskInstance, abortController });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.eventWatermark).toBeUndefined();
    });

    it('returns updated previousStartedAt in state', async () => {
      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({
        state: {
          previousStartedAt: '2026-01-22T07:45:00.000Z',
        },
      });
    });

    it('persists nextEventWatermark from the dispatcher result', async () => {
      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'), {
          nextEventWatermark: '2026-01-22T07:44:55.000Z',
        })
      );

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({
        state: {
          previousStartedAt: '2026-01-22T07:45:00.000Z',
          eventWatermark: '2026-01-22T07:44:55.000Z',
        },
      });
    });

    it('preserves the prior eventWatermark when the dispatcher returns no advance (step_error)', async () => {
      // Simulates a tick that halted with `step_error` — the dispatcher
      // signals "do not advance" by omitting `nextEventWatermark`. The
      // failed window must be re-readable on the next tick.
      const taskInstanceWithWatermark = {
        ...taskInstance,
        state: {
          previousStartedAt: '2026-01-22T07:30:00.000Z',
          eventWatermark: '2026-01-22T07:29:00.000Z',
        },
      };

      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      const result = await runner.run({ taskInstance: taskInstanceWithWatermark, abortController });

      expect(result).toEqual({
        state: {
          previousStartedAt: '2026-01-22T07:45:00.000Z',
          eventWatermark: '2026-01-22T07:29:00.000Z',
        },
      });
    });

    it('does not invent a watermark when neither prior state nor dispatcher result has one', async () => {
      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      const result = await runner.run({ taskInstance, abortController });

      expect(result.state).not.toHaveProperty('eventWatermark');
    });

    it('skips dispatcher when setting is disabled', async () => {
      dispatcherEnabledProvider.mockResolvedValue(false);

      const result = await runner.run({ taskInstance, abortController });

      expect(dispatcherService.run).not.toHaveBeenCalled();
      expect(result).toEqual({ state: taskInstance.state });
    });

    it('preserves previousStartedAt when disabled', async () => {
      dispatcherEnabledProvider.mockResolvedValue(false);

      const result = await runner.run({ taskInstance, abortController });

      expect(result.state).toEqual({ previousStartedAt: '2026-01-22T07:30:00.000Z' });
    });

    it('preserves eventWatermark when disabled', async () => {
      const taskInstanceWithWatermark = {
        ...taskInstance,
        state: {
          previousStartedAt: '2026-01-22T07:30:00.000Z',
          eventWatermark: '2026-01-22T07:29:00.000Z',
        },
      };
      dispatcherEnabledProvider.mockResolvedValue(false);

      const result = await runner.run({ taskInstance: taskInstanceWithWatermark, abortController });

      expect(result.state).toEqual(taskInstanceWithWatermark.state);
    });

    it('defaults to enabled when uiSettings read fails', async () => {
      dispatcherEnabledProvider.mockRejectedValue(new Error('SO unavailable'));
      dispatcherService.run.mockResolvedValue(
        stubExecutionResult(new Date('2026-01-22T07:45:00.000Z'))
      );

      await runner.run({ taskInstance, abortController });

      expect(dispatcherService.run).toHaveBeenCalled();
    });
  });
});
