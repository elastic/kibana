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
  SEVERITY_RETENTION_DAYS,
} from './cleanup_task';
import { NOTIFICATION_DATA_STREAM_NAME } from './data_stream/notification_data_stream';

describe('cleanup_task', () => {
  describe('SEVERITY_RETENTION_DAYS', () => {
    it('has correct TTLs per severity', () => {
      expect(SEVERITY_RETENTION_DAYS.info).toBe(30);
      expect(SEVERITY_RETENTION_DAYS.warning).toBe(60);
      expect(SEVERITY_RETENTION_DAYS.error).toBe(180);
      expect(SEVERITY_RETENTION_DAYS.critical).toBe(180);
    });

    it('all TTLs stay within the 180d ILM ceiling', () => {
      for (const days of Object.values(SEVERITY_RETENTION_DAYS)) {
        expect(days).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('buildCleanupQuery()', () => {
    it('returns a bool query with minimum_should_match: 1', () => {
      const query = buildCleanupQuery();
      expect(query.bool.minimum_should_match).toBe(1);
    });

    it('produces one should-clause per severity (4 total)', () => {
      const query = buildCleanupQuery();
      expect(query.bool.should).toHaveLength(4);
    });

    it('each clause filters by term severity and @timestamp range', () => {
      const query = buildCleanupQuery();
      const clauses = query.bool.should;

      const infoClause = clauses.find((c) => c.bool.filter[0].term?.severity === 'info');
      expect(infoClause).toBeDefined();
      expect(infoClause!.bool.filter[1].range?.['@timestamp'].lt).toBe('now-30d/d');

      const warningClause = clauses.find((c) => c.bool.filter[0].term?.severity === 'warning');
      expect(warningClause).toBeDefined();
      expect(warningClause!.bool.filter[1].range?.['@timestamp'].lt).toBe('now-60d/d');

      const errorClause = clauses.find((c) => c.bool.filter[0].term?.severity === 'error');
      expect(errorClause).toBeDefined();
      expect(errorClause!.bool.filter[1].range?.['@timestamp'].lt).toBe('now-180d/d');

      const criticalClause = clauses.find((c) => c.bool.filter[0].term?.severity === 'critical');
      expect(criticalClause).toBeDefined();
      expect(criticalClause!.bool.filter[1].range?.['@timestamp'].lt).toBe('now-180d/d');
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
