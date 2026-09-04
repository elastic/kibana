/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskCost } from '@kbn/task-manager-plugin/server';
import {
  CLEANUP_TASK_ID,
  CLEANUP_TASK_TYPE,
  registerNotificationCleanupTask,
  scheduleNotificationCleanupTask,
} from './cleanup_task';
import { NOTIFICATION_DATA_RETENTION } from '../storage/notification_data_stream';
import { MAX_SEVERITY_TTL_DAYS, SEVERITY_TTL_DAYS } from '../../common/notification_schema';

describe('cleanup_task', () => {
  describe('SEVERITY_TTL_DAYS', () => {
    it('has correct TTLs per severity', () => {
      expect(SEVERITY_TTL_DAYS.info).toBe(30);
      expect(SEVERITY_TTL_DAYS.warning).toBe(60);
      expect(SEVERITY_TTL_DAYS.error).toBe(180);
      expect(SEVERITY_TTL_DAYS.critical).toBe(180);
      expect(MAX_SEVERITY_TTL_DAYS).toBe(180);
    });

    it('all TTLs stay within the data stream ILM ceiling', () => {
      const ceilingDays = Number(NOTIFICATION_DATA_RETENTION.replace('d', ''));

      for (const days of Object.values(SEVERITY_TTL_DAYS)) {
        expect(days).toBeLessThanOrEqual(ceilingDays);
      }
    });
  });

  describe('registerNotificationCleanupTask()', () => {
    const search = jest.fn();
    const deleteByQuery = jest.fn().mockResolvedValue({});
    const getStartServices = jest
      .fn()
      .mockResolvedValue([
        { elasticsearch: { client: { asInternalUser: { search, deleteByQuery } } } },
      ]);
    const core = { getStartServices } as any;

    const registerTaskDefinitions = jest.fn();
    const taskManager = { registerTaskDefinitions } as any;

    const logger = { error: jest.fn() } as any;

    const abortController = new AbortController();

    beforeEach(() => {
      jest.clearAllMocks();
      search.mockResolvedValue({ aggregations: { expired_groups: { buckets: [] } } });
    });

    it('registers the task with the correct type, title, cost, and timeout', () => {
      registerNotificationCleanupTask(core, taskManager, logger);

      expect(registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          [CLEANUP_TASK_TYPE]: expect.objectContaining({
            title: 'Notification Center retention cleanup',
            cost: TaskCost.Normal,
            timeout: '10m',
          }),
        })
      );
    });

    it('run() searches for expired groups with the abort signal', async () => {
      registerNotificationCleanupTask(core, taskManager, logger);

      const taskDef = registerTaskDefinitions.mock.calls[0][0][CLEANUP_TASK_TYPE];
      const runner = taskDef.createTaskRunner({ signal: abortController.signal });
      await runner.run();

      expect(search).toHaveBeenCalledWith(expect.any(Object), { signal: abortController.signal });
      expect(deleteByQuery).not.toHaveBeenCalled();
    });

    it('run() logs an error and does not throw when cleanup fails', async () => {
      search.mockRejectedValueOnce(new Error('ES unavailable'));

      registerNotificationCleanupTask(core, taskManager, logger);

      const taskDef = registerTaskDefinitions.mock.calls[0][0][CLEANUP_TASK_TYPE];
      const runner = taskDef.createTaskRunner({ signal: abortController.signal });

      await expect(runner.run()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES unavailable'));
    });

    it('does not start cleanup after the task is aborted', async () => {
      const aborted = new AbortController();
      aborted.abort();
      registerNotificationCleanupTask(core, taskManager, logger);

      const taskDef = registerTaskDefinitions.mock.calls[0][0][CLEANUP_TASK_TYPE];
      const runner = taskDef.createTaskRunner({ signal: aborted.signal });
      await runner.run();

      expect(search).not.toHaveBeenCalled();
    });
  });

  describe('scheduleNotificationCleanupTask()', () => {
    it('calls ensureScheduled with correct id, taskType, and daily interval', async () => {
      const ensureScheduled = jest.fn().mockResolvedValue({});
      const taskManager = { ensureScheduled } as any;

      await scheduleNotificationCleanupTask(taskManager);

      expect(ensureScheduled).toHaveBeenCalledWith({
        id: CLEANUP_TASK_ID,
        taskType: CLEANUP_TASK_TYPE,
        schedule: { interval: '1d' },
        state: {},
        params: {},
      });
    });
  });
});
