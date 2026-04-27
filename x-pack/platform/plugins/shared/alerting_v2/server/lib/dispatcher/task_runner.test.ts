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
import type { DispatcherTaskState } from './types';

describe('DispatcherTaskRunner', () => {
  let dispatcherService: jest.Mocked<DispatcherServiceContract>;
  let dispatcherEnabledProvider: jest.MockedFunction<DispatcherEnabledProvider>;
  let runner: DispatcherTaskRunner;
  let abortController: AbortController;

  function buildTaskInstance(state: DispatcherTaskState): ConcreteTaskInstance {
    // @ts-expect-error: not all fields are required for these tests
    return {
      id: 'task-1',
      params: {},
      state,
      scheduledAt: new Date('2026-01-22T07:30:00.000Z'),
      startedAt: new Date('2026-01-22T07:30:00.000Z'),
    };
  }

  const taskInstance = buildTaskInstance({
    previousStartedAt: '2026-01-22T07:30:00.000Z',
  });

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
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
      });

      await runner.run({ taskInstance, abortController });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.abortController).toBe(abortController);
      expect(params.previousStartedAt?.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });

    it('returns updated previousStartedAt in state', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result).toEqual({
        state: {
          previousStartedAt: '2026-01-22T07:45:00.000Z',
        },
      });
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

    it('defaults to enabled when uiSettings read fails', async () => {
      dispatcherEnabledProvider.mockRejectedValue(new Error('SO unavailable'));
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
      });

      await runner.run({ taskInstance, abortController });

      expect(dispatcherService.run).toHaveBeenCalled();
    });

    it('passes persisted eventWatermark from task state into dispatcher params', async () => {
      const watermarkIso = '2026-01-22T07:42:00.000Z';
      const task = buildTaskInstance({
        previousStartedAt: '2026-01-22T07:30:00.000Z',
        eventWatermark: watermarkIso,
      });
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextEventWatermark: '2026-01-22T07:43:00.000Z',
      });

      await runner.run({ taskInstance: task, abortController });

      const [params] = dispatcherService.run.mock.calls[0];
      expect(params.eventWatermark?.toISOString()).toBe(watermarkIso);
    });

    it('persists nextEventWatermark from dispatcher result', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
        nextEventWatermark: '2026-01-22T07:44:55.000Z',
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result.state).toEqual({
        previousStartedAt: '2026-01-22T07:45:00.000Z',
        eventWatermark: '2026-01-22T07:44:55.000Z',
      });
    });

    it('preserves prior eventWatermark when dispatcher omits nextEventWatermark', async () => {
      const task = buildTaskInstance({
        previousStartedAt: '2026-01-22T07:30:00.000Z',
        eventWatermark: '2026-01-22T07:42:00.000Z',
      });
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
      });

      const result = await runner.run({ taskInstance: task, abortController });

      // previousStartedAt advances (wall-clock telemetry); eventWatermark
      // stays where it was so the unfinished window is re-read next tick.
      expect(result.state).toEqual({
        previousStartedAt: '2026-01-22T07:45:00.000Z',
        eventWatermark: '2026-01-22T07:42:00.000Z',
      });
    });

    it('does not invent an eventWatermark when neither prior state nor result has one', async () => {
      dispatcherService.run.mockResolvedValue({
        startedAt: new Date('2026-01-22T07:45:00.000Z'),
      });

      const result = await runner.run({ taskInstance, abortController });

      expect(result.state).toEqual({
        previousStartedAt: '2026-01-22T07:45:00.000Z',
      });
      expect((result.state as DispatcherTaskState).eventWatermark).toBeUndefined();
    });

    it('preserves eventWatermark when disabled', async () => {
      dispatcherEnabledProvider.mockResolvedValue(false);
      const task = buildTaskInstance({
        previousStartedAt: '2026-01-22T07:30:00.000Z',
        eventWatermark: '2026-01-22T07:42:00.000Z',
      });

      const result = await runner.run({ taskInstance: task, abortController });

      expect(dispatcherService.run).not.toHaveBeenCalled();
      expect(result.state).toEqual({
        previousStartedAt: '2026-01-22T07:30:00.000Z',
        eventWatermark: '2026-01-22T07:42:00.000Z',
      });
    });

    it('propagates dispatcher errors so Task Manager retries and the watermark stays put', async () => {
      const task = buildTaskInstance({
        previousStartedAt: '2026-01-22T07:30:00.000Z',
        eventWatermark: '2026-01-22T07:42:00.000Z',
      });
      dispatcherService.run.mockRejectedValue(new Error('pipeline blew up'));

      await expect(runner.run({ taskInstance: task, abortController })).rejects.toThrow(
        'pipeline blew up'
      );
    });
  });
});
