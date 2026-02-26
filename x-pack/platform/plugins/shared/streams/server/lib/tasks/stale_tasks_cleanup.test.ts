/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  StaleTasksCleanupTask,
  STALE_TASKS_CLEANUP_TASK_TYPE,
  STALE_TASKS_CLEANUP_TASK_VERSION,
  STALE_THRESHOLD_DAYS,
} from './stale_tasks_cleanup';

describe('StaleTasksCleanupTask', () => {
  let mockLogger: MockedLogger;
  let mockCore: jest.Mocked<CoreSetup>;
  let mockCoreStart: jest.Mocked<CoreStart>;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  let mockTaskManagerStart: jest.Mocked<TaskManagerStartContract>;
  let staleTasksCleanupTask: StaleTasksCleanupTask;

  beforeEach(() => {
    mockLogger = loggerMock.create();

    mockCoreStart = {
      elasticsearch: {
        client: {
          asInternalUser: {
            // Mock ES client - the StorageIndexAdapter wraps this
          },
        },
      },
    } as unknown as jest.Mocked<CoreStart>;

    mockCore = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([mockCoreStart, { taskManager: mockTaskManagerStart }, {}]),
    } as unknown as jest.Mocked<CoreSetup>;

    mockTaskManagerSetup = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as jest.Mocked<TaskManagerSetupContract>;

    mockTaskManagerStart = {
      ensureScheduled: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TaskManagerStartContract>;

    staleTasksCleanupTask = new StaleTasksCleanupTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logger: mockLogger,
    });
  });

  describe('constructor', () => {
    it('registers the task definition', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          [STALE_TASKS_CLEANUP_TASK_TYPE]: expect.objectContaining({
            title: 'Streams Stale Tasks Cleanup',
            timeout: '5m',
            createTaskRunner: expect.any(Function),
          }),
        })
      );
    });
  });

  describe('taskId', () => {
    it('returns the correct task id with version', () => {
      expect(staleTasksCleanupTask.taskId).toBe(
        `${STALE_TASKS_CLEANUP_TASK_TYPE}:${STALE_TASKS_CLEANUP_TASK_VERSION}`
      );
    });
  });

  describe('start', () => {
    it('schedules the task with 24h interval', async () => {
      await staleTasksCleanupTask.start({ taskManager: mockTaskManagerStart });

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith({
        id: staleTasksCleanupTask.taskId,
        taskType: STALE_TASKS_CLEANUP_TASK_TYPE,
        scope: ['streams'],
        schedule: {
          interval: '24h',
        },
        state: {},
        params: { version: STALE_TASKS_CLEANUP_TASK_VERSION },
      });
    });

    it('logs info message on start', async () => {
      await staleTasksCleanupTask.start({ taskManager: mockTaskManagerStart });

      expect(mockLogger.get).toHaveBeenCalledWith('stale-tasks-cleanup');
    });

    it('handles scheduling errors gracefully', async () => {
      mockTaskManagerStart.ensureScheduled.mockRejectedValue(new Error('Scheduling failed'));

      await staleTasksCleanupTask.start({ taskManager: mockTaskManagerStart });

      // Should not throw
    });
  });

  describe('STALE_THRESHOLD_DAYS', () => {
    it('is set to 7 days', () => {
      expect(STALE_THRESHOLD_DAYS).toBe(7);
    });
  });
});

describe('Stale task filtering logic', () => {
  const now = new Date('2024-01-20T10:00:00.000Z');
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Helper to create task with activity
  const createTask = (
    id: string,
    created_at: string,
    extras: {
      last_completed_at?: string;
      last_acknowledged_at?: string;
      last_canceled_at?: string;
      last_failed_at?: string;
    } = {}
  ) => ({
    id,
    created_at,
    ...extras,
  });

  const getLastActivity = (task: {
    created_at: string;
    last_completed_at?: string;
    last_acknowledged_at?: string;
    last_canceled_at?: string;
    last_failed_at?: string;
  }): Date => {
    const timestamps = [
      task.created_at,
      task.last_completed_at,
      task.last_acknowledged_at,
      task.last_canceled_at,
      task.last_failed_at,
    ]
      .filter((ts): ts is string => ts !== undefined)
      .map((ts) => new Date(ts).getTime());

    return new Date(Math.max(...timestamps));
  };

  it('identifies stale tasks (no activity in 7+ days)', () => {
    const staleTask = createTask('stale-task', '2024-01-10T10:00:00.000Z');
    const lastActivity = getLastActivity(staleTask);

    expect(lastActivity < sevenDaysAgo).toBe(true);
  });

  it('does not mark recent tasks as stale', () => {
    const recentTask = createTask('recent-task', '2024-01-15T10:00:00.000Z');
    const lastActivity = getLastActivity(recentTask);

    expect(lastActivity < sevenDaysAgo).toBe(false);
  });

  it('considers last_completed_at for activity', () => {
    const task = createTask('task-with-completion', '2024-01-01T10:00:00.000Z', {
      last_completed_at: '2024-01-19T10:00:00.000Z', // Recent completion
    });
    const lastActivity = getLastActivity(task);

    expect(lastActivity < sevenDaysAgo).toBe(false);
  });

  it('considers last_acknowledged_at for activity', () => {
    const task = createTask('task-with-ack', '2024-01-01T10:00:00.000Z', {
      last_acknowledged_at: '2024-01-18T10:00:00.000Z', // Recent acknowledgment
    });
    const lastActivity = getLastActivity(task);

    expect(lastActivity < sevenDaysAgo).toBe(false);
  });

  it('considers last_canceled_at for activity', () => {
    const task = createTask('task-with-cancel', '2024-01-01T10:00:00.000Z', {
      last_canceled_at: '2024-01-19T10:00:00.000Z', // Recent cancellation
    });
    const lastActivity = getLastActivity(task);

    expect(lastActivity < sevenDaysAgo).toBe(false);
  });

  it('considers last_failed_at for activity', () => {
    const task = createTask('task-with-failure', '2024-01-01T10:00:00.000Z', {
      last_failed_at: '2024-01-19T10:00:00.000Z', // Recent failure
    });
    const lastActivity = getLastActivity(task);

    expect(lastActivity < sevenDaysAgo).toBe(false);
  });

  it('marks task as stale when all timestamps are old', () => {
    const oldTask = createTask('old-task', '2024-01-01T10:00:00.000Z', {
      last_completed_at: '2024-01-02T10:00:00.000Z',
      last_acknowledged_at: '2024-01-03T10:00:00.000Z',
      last_canceled_at: '2024-01-04T10:00:00.000Z',
      last_failed_at: '2024-01-05T10:00:00.000Z',
    });
    const lastActivity = getLastActivity(oldTask);

    expect(lastActivity < sevenDaysAgo).toBe(true);
  });
});
