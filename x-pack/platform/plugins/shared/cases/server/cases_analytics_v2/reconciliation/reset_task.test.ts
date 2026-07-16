/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { V2_NOOP_WRITER } from '../writer';
import { V2_NOOP_ACTIVITY_WRITER } from '../writer/activity';
import { V2_NOOP_ATTACHMENTS_WRITER } from '../writer/attachments';
import type { RunFullResetResult } from './reset_runner';
import { runFullReset } from './reset_runner';
import {
  RESET_TASK_ID,
  RESET_TASK_TYPE,
  fetchResetTask,
  registerResetTask,
  scheduleResetTask,
} from './reset_task';

jest.mock('./reset_runner');
const mockRunFullReset = runFullReset as jest.MockedFunction<typeof runFullReset>;

// Minimal successful result shape; individual tests override the slots
// they care about. `processed` counts and cursors flow into the final
// task state.
const successResult = (): RunFullResetResult =>
  ({
    cases: { processed: 5, newLastRunAt: 'CASES_CURSOR' },
    activity: { processed: 6, newLastRunAt: 'ACTIVITY_CURSOR' },
    attachments: { processed: 7, newLastRunAt: 'ATTACHMENTS_CURSOR' },
    casesCursor: 'CASES_CURSOR',
    activityCursor: 'ACTIVITY_CURSOR',
    attachmentsCursor: 'ATTACHMENTS_CURSOR',
    casesError: null,
    activityError: null,
    attachmentsError: null,
  } as unknown as RunFullResetResult);

/**
 * Registers the reset task, extracts the `run()` closure Task Manager
 * would invoke, and returns it alongside the mocks so tests can assert on
 * progress writes.
 */
const setupRunner = (tmStart: TaskManagerStartContract) => {
  const taskManager = taskManagerMock.createSetup() as unknown as TaskManagerSetupContract;
  const logger = loggerMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();

  registerResetTask({
    taskManager,
    logger,
    timeoutMinutes: 90,
    pageDelayMs: 0,
    reconciliationIntervalMinutes: 5,
    getRunnerDeps: async () => ({
      savedObjectsClient,
      writer: V2_NOOP_WRITER,
      activityWriter: V2_NOOP_ACTIVITY_WRITER,
      attachmentsWriter: V2_NOOP_ATTACHMENTS_WRITER,
      taskManager: tmStart,
    }),
  });

  const registerFn = (taskManager as unknown as { registerTaskDefinitions: jest.Mock })
    .registerTaskDefinitions;
  const definitions = registerFn.mock.calls[0][0];
  const definition = definitions[RESET_TASK_TYPE];
  const run = definition.createTaskRunner().run as () => Promise<{ state: unknown }>;

  return { run, definition, logger, definitions };
};

describe('reset_task', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerResetTask', () => {
    it('registers the one-shot reset type with a configurable timeout and no auto-retry', () => {
      const { definition, definitions } = setupRunner(taskManagerMock.createStart());

      expect(Object.keys(definitions)).toEqual([RESET_TASK_TYPE]);
      // Timeout is per-tenant configurable and rendered as Task Manager's
      // `${N}m` string form.
      expect(definition.timeout).toBe('90m');
      // No auto-retry: a failed reset must surface via /state, not silently
      // re-run an hour later and stack load on an already-stressed cluster.
      expect(definition.maxAttempts).toBe(1);
      expect(definition.title).toEqual(expect.any(String));
    });
  });

  describe('run()', () => {
    it('writes an initial running-phase progress flush then returns the completed final state', async () => {
      const tmStart = taskManagerMock.createStart();
      mockRunFullReset.mockResolvedValue(successResult());

      const { run } = setupRunner(tmStart);
      const { state } = (await run()) as { state: Record<string, unknown> };

      // Initial leading-edge flush so /state shows `running` immediately.
      expect(tmStart.bulkUpdateState).toHaveBeenCalled();
      const [ids, updater] = (tmStart.bulkUpdateState as jest.Mock).mock.calls[0];
      expect(ids).toEqual([RESET_TASK_ID]);
      const initial = (updater as (s: unknown) => Record<string, unknown>)({});
      expect(initial.phase).toBe('running');
      expect(initial.started_at).toEqual(expect.any(String));

      // Final state returned to Task Manager (written to the SO just before
      // TM self-deletes the one-shot task).
      expect(state.phase).toBe('completed');
      expect(state.cases_processed).toBe(5);
      expect(state.activity_processed).toBe(6);
      expect(state.attachments_processed).toBe(7);
      expect(state.cases_cursor).toBe('CASES_CURSOR');
      expect(state.activity_cursor).toBe('ACTIVITY_CURSOR');
      expect(state.attachments_cursor).toBe('ATTACHMENTS_CURSOR');
      expect(state.completed_at).toEqual(expect.any(String));
      expect(state.cases_error).toBeNull();
      expect(state.activity_error).toBeNull();
      expect(state.attachments_error).toBeNull();
    });

    it('routes per-surface onProgress counts to the matching *_processed slot', async () => {
      const tmStart = taskManagerMock.createStart();
      // Results carry no `processed`, so the final state falls back to the
      // live counts the onProgress callback routed — isolating the routing
      // branch (cases → cases_processed, etc.).
      mockRunFullReset.mockImplementation(async ({ onProgress }) => {
        onProgress?.({ phase: 'cases', processed: 11 });
        onProgress?.({ phase: 'activity', processed: 22 });
        onProgress?.({ phase: 'attachments', processed: 33 });
        return {
          cases: null,
          activity: null,
          attachments: null,
          casesCursor: null,
          activityCursor: null,
          attachmentsCursor: null,
          casesError: null,
          activityError: null,
          attachmentsError: null,
        } as unknown as RunFullResetResult;
      });

      const { run } = setupRunner(tmStart);
      const { state } = (await run()) as { state: Record<string, unknown> };

      expect(state.cases_processed).toBe(11);
      expect(state.activity_processed).toBe(22);
      expect(state.attachments_processed).toBe(33);
    });

    it('throws (preserving the failed SO) when every surface fails, naming each error', async () => {
      const tmStart = taskManagerMock.createStart();
      mockRunFullReset.mockResolvedValue({
        cases: null,
        activity: null,
        attachments: null,
        casesCursor: null,
        activityCursor: null,
        attachmentsCursor: null,
        casesError: new Error('cases boom'),
        activityError: new Error('activity boom'),
        attachmentsError: new Error('attachments boom'),
      } as unknown as RunFullResetResult);

      const { run } = setupRunner(tmStart);

      // Throwing keeps the task SO alive with status:failed so /state can
      // surface it; the message lists every surface error.
      await expect(run()).rejects.toThrow(/cases boom.*activity boom.*attachments boom/s);
    });

    it('returns (self-deletes) on partial failure, recording the failed surface error + null cursor', async () => {
      const tmStart = taskManagerMock.createStart();
      mockRunFullReset.mockResolvedValue({
        cases: { processed: 5, newLastRunAt: 'CASES_CURSOR' },
        activity: { processed: 6, newLastRunAt: 'ACTIVITY_CURSOR' },
        attachments: null,
        casesCursor: 'CASES_CURSOR',
        activityCursor: 'ACTIVITY_CURSOR',
        attachmentsCursor: null,
        casesError: null,
        activityError: null,
        attachmentsError: new Error('attachments boom'),
      } as unknown as RunFullResetResult);

      const { run } = setupRunner(tmStart);
      const { state } = (await run()) as { state: Record<string, unknown> };

      expect(state.phase).toBe('completed');
      expect(state.attachments_error).toBe('attachments boom');
      // Failed surface's cursor is left unset so the next periodic tick
      // re-walks it and recovers missed docs.
      expect(state.attachments_cursor).toBeNull();
      // The healthy surfaces keep their cursors.
      expect(state.cases_cursor).toBe('CASES_CURSOR');
      expect(state.activity_cursor).toBe('ACTIVITY_CURSOR');
    });

    it('treats a progress-write failure as non-fatal and still completes the walk', async () => {
      const tmStart = taskManagerMock.createStart();
      // A 404/409 on the advisory progress write must not fail the reset.
      (tmStart.bulkUpdateState as jest.Mock).mockRejectedValue(new Error('version conflict'));
      mockRunFullReset.mockResolvedValue(successResult());

      const { run, logger } = setupRunner(tmStart);
      const { state } = (await run()) as { state: Record<string, unknown> };

      expect(state.phase).toBe('completed');
      // Flush the microtask queue so the fire-and-forget progress write's
      // rejection is handled before we assert on the debug log.
      await new Promise((resolve) => setImmediate(resolve));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('progress write failed'));
    });
  });

  describe('scheduleResetTask', () => {
    it('removes any in-flight reset then schedules a fresh one-shot on the singleton id', async () => {
      const taskManager = taskManagerMock.createStart();
      const logger = loggerMock.create();
      (taskManager.schedule as jest.Mock).mockResolvedValue({ id: RESET_TASK_ID });

      const result = await scheduleResetTask({ taskManager, logger });

      expect(taskManager.removeIfExists).toHaveBeenCalledWith(RESET_TASK_ID);
      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: RESET_TASK_ID,
          taskType: RESET_TASK_TYPE,
          params: {},
          state: {},
        })
      );
      expect(result).toEqual({ id: RESET_TASK_ID });
    });

    it('warns but still schedules when removing the prior reset fails', async () => {
      const taskManager = taskManagerMock.createStart();
      const logger = loggerMock.create();
      (taskManager.removeIfExists as jest.Mock).mockRejectedValue(new Error('remove failed'));
      (taskManager.schedule as jest.Mock).mockResolvedValue({ id: RESET_TASK_ID });

      await scheduleResetTask({ taskManager, logger });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('remove failed'));
      expect(taskManager.schedule).toHaveBeenCalled();
    });
  });

  describe('fetchResetTask', () => {
    it('returns the reset task instance when one exists', async () => {
      const taskManager = taskManagerMock.createStart();
      const logger = loggerMock.create();
      const instance = { id: RESET_TASK_ID, taskType: RESET_TASK_TYPE };
      (taskManager.get as jest.Mock).mockResolvedValue(instance);

      await expect(fetchResetTask({ taskManager, logger })).resolves.toBe(instance);
    });

    it('maps a 404 to null (no reset scheduled) without warning', async () => {
      const taskManager = taskManagerMock.createStart();
      const logger = loggerMock.create();
      (taskManager.get as jest.Mock).mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );

      await expect(fetchResetTask({ taskManager, logger })).resolves.toBeNull();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('warns and returns null on a non-404 fetch failure', async () => {
      const taskManager = taskManagerMock.createStart();
      const logger = loggerMock.create();
      (taskManager.get as jest.Mock).mockRejectedValue(new Error('cluster unavailable'));

      await expect(fetchResetTask({ taskManager, logger })).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
    });
  });
});
