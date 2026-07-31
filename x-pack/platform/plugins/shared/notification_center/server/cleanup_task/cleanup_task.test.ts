/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskCost } from '@kbn/task-manager-plugin/server';
import {
  buildCleanupQuery,
  CLEANUP_TASK_ID,
  CLEANUP_TASK_TYPE,
  registerNotificationCleanupTask,
  scheduleNotificationCleanupTask,
} from './cleanup_task';
import { NOTIFICATION_DATA_STREAM_NAME } from '../storage/notification_data_stream';
import { SEVERITY_TTL_DAYS } from '../../common/notification_schema';

describe('cleanup_task', () => {
  describe('SEVERITY_RETENTION_DAYS', () => {
    it('has correct TTLs per severity', () => {
      expect(SEVERITY_TTL_DAYS.info).toBe(30);
      expect(SEVERITY_TTL_DAYS.warning).toBe(60);
      expect(SEVERITY_TTL_DAYS.error).toBe(180);
      expect(SEVERITY_TTL_DAYS.critical).toBe(180);
    });

    it('all TTLs stay within the 180d ILM ceiling', () => {
      for (const days of Object.values(SEVERITY_TTL_DAYS)) {
        expect(days).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('buildCleanupQuery()', () => {
    it('returns a bool query with minimum_should_match: 1', () => {
      const query = buildCleanupQuery();
      expect(query.bool.minimum_should_match).toBe(1);
    });

    it('produces one should-clause per TTL window (3 total)', () => {
      const query = buildCleanupQuery();
      expect(query.bool.should).toHaveLength(3);
    });

    it('each clause filters by terms severity and @timestamp range', () => {
      const query = buildCleanupQuery();
      const clauses = query.bool.should;

      const byLt = (lt: string) =>
        clauses.find((c) => c.bool.filter[1].range?.['@timestamp'].lt === lt);

      const infoClause = byLt('now-30d/d');
      expect(infoClause).toBeDefined();
      expect(infoClause!.bool.filter[0].terms?.severity).toEqual(['info']);

      const warningClause = byLt('now-60d/d');
      expect(warningClause).toBeDefined();
      expect(warningClause!.bool.filter[0].terms?.severity).toEqual(['warning']);

      const longLivedClause = byLt('now-180d/d');
      expect(longLivedClause).toBeDefined();
      expect(longLivedClause!.bool.filter[0].terms?.severity).toEqual(['error', 'critical']);
    });
  });

  describe('registerNotificationCleanupTask()', () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});
    const getStartServices = jest
      .fn()
      .mockResolvedValue([{ elasticsearch: { client: { asInternalUser: { deleteByQuery } } } }]);
    const core = { getStartServices } as any;

    const registerTaskDefinitions = jest.fn();
    const taskManager = { registerTaskDefinitions } as any;

    const logger = { error: jest.fn() } as any;

    const abortController = new AbortController();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('registers the task with the correct type, title, cost, and timeout', () => {
      registerNotificationCleanupTask(core, taskManager, logger);

      expect(registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          [CLEANUP_TASK_TYPE]: expect.objectContaining({
            title: 'Notification Center retention cleanup',
            cost: TaskCost.Tiny,
            timeout: '10m',
          }),
        })
      );
    });

    it('run() calls deleteByQuery against the notification data stream with the abort signal', async () => {
      registerNotificationCleanupTask(core, taskManager, logger);

      const taskDef = registerTaskDefinitions.mock.calls[0][0][CLEANUP_TASK_TYPE];
      const runner = taskDef.createTaskRunner({ signal: abortController.signal });
      await runner.run();

      expect(deleteByQuery).toHaveBeenCalledWith(
        {
          index: NOTIFICATION_DATA_STREAM_NAME,
          ignore_unavailable: true,
          conflicts: 'proceed',
          refresh: false,
          query: buildCleanupQuery(),
        },
        { signal: abortController.signal }
      );
    });

    it('run() logs an error and does not throw when deleteByQuery fails', async () => {
      deleteByQuery.mockRejectedValueOnce(new Error('ES unavailable'));

      registerNotificationCleanupTask(core, taskManager, logger);

      const taskDef = registerTaskDefinitions.mock.calls[0][0][CLEANUP_TASK_TYPE];
      const runner = taskDef.createTaskRunner({ signal: abortController.signal });

      await expect(runner.run()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES unavailable'));
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
