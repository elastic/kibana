/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { TaskStatus } from '@kbn/streams-schema';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskClient, MAX_RESCHEDULE_RETRIES } from './task_client';
import type { TaskStorageClient } from './storage';
import type { PersistedTask } from './types';
import { CancellationInProgressError } from './cancellation_in_progress_error';

describe('TaskClient', () => {
  const createMockLogger = (): jest.Mocked<Logger> =>
    ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>);

  const createMockStorageClient = (): jest.Mocked<TaskStorageClient> =>
    ({
      get: jest.fn(),
      index: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TaskStorageClient>);

  const createMockTaskManager = (): jest.Mocked<TaskManagerStartContract> =>
    ({
      schedule: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TaskManagerStartContract>);

  const createMockRequest = (): KibanaRequest =>
    ({
      headers: {},
    } as unknown as KibanaRequest);

  const createPersistedTask = (overrides: Partial<PersistedTask> = {}): PersistedTask =>
    ({
      id: 'test-task-id',
      type: 'test-task-type',
      status: TaskStatus.InProgress,
      space: 'default',
      created_at: new Date().toISOString(),
      task: {
        params: { someParam: 'value' },
      },
      ...overrides,
    } as PersistedTask);

  describe('reschedule', () => {
    let taskClient: TaskClient<'test-task-type'>;
    let mockLogger: jest.Mocked<Logger>;
    let mockStorageClient: jest.Mocked<TaskStorageClient>;
    let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
    let mockRequest: KibanaRequest;

    beforeEach(() => {
      mockLogger = createMockLogger();
      mockStorageClient = createMockStorageClient();
      mockTaskManager = createMockTaskManager();
      mockRequest = createMockRequest();

      taskClient = new TaskClient(mockTaskManager, mockStorageClient, mockLogger);

      // Default: return a non-canceling task status
      mockStorageClient.get.mockResolvedValue({
        _source: createPersistedTask({ status: TaskStatus.Completed }),
      } as any);
    });

    it('reschedules a task with retry_count = 1 when no previous retries', async () => {
      const currentTask = createPersistedTask({ task: { params: { foo: 'bar' } } });

      const result = await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);

      expect(result).toBe(true);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rescheduling task test-task-id (retry 1/5)')
      );
    });

    it('increments retry_count when rescheduling', async () => {
      const currentTask = createPersistedTask({
        task: { params: { foo: 'bar' }, retry_count: 2 },
      });

      const result = await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rescheduling task test-task-id (retry 3/5)')
      );
    });

    it('returns false when retry_count equals MAX_RESCHEDULE_RETRIES', async () => {
      const currentTask = createPersistedTask({
        task: { params: { foo: 'bar' }, retry_count: MAX_RESCHEDULE_RETRIES },
      });

      const result = await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);

      expect(result).toBe(false);
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('has exceeded max reschedule retries')
      );
    });

    it('returns false when retry_count exceeds MAX_RESCHEDULE_RETRIES', async () => {
      const currentTask = createPersistedTask({
        task: { params: { foo: 'bar' }, retry_count: MAX_RESCHEDULE_RETRIES + 1 },
      });

      const result = await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);

      expect(result).toBe(false);
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
    });

    it('treats undefined retry_count as 0', async () => {
      const currentTask = createPersistedTask({
        task: { params: { foo: 'bar' } }, // No retry_count
      });

      const result = await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('retry 1/5'));
    });

    it('preserves task metadata when rescheduling', async () => {
      const currentTask = createPersistedTask({
        id: 'my-task-id',
        type: 'my-task-type',
        space: 'custom-space',
        last_completed_at: '2024-01-01T00:00:00.000Z',
        last_acknowledged_at: '2024-01-02T00:00:00.000Z',
        task: { params: { original: 'params' }, retry_count: 1 },
      });

      await taskClient.reschedule(currentTask, { new: 'params' }, mockRequest);

      // Verify schedule was called with correct task metadata
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'my-task-id',
          taskType: 'my-task-type',
        }),
        { request: mockRequest }
      );
    });

    it('throws CancellationInProgressError if task is being canceled', async () => {
      mockStorageClient.get.mockResolvedValue({
        _source: createPersistedTask({ status: TaskStatus.BeingCanceled }),
      } as any);

      const currentTask = createPersistedTask({
        task: { params: { foo: 'bar' } },
      });

      await expect(
        taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest)
      ).rejects.toBeInstanceOf(CancellationInProgressError);
    });

    it('stores retry_count in the task document', async () => {
      const currentTask = createPersistedTask({
        task: { params: { foo: 'bar' }, retry_count: 2 },
      });

      await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);

      // Verify the storage client was called with retry_count
      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            task: expect.objectContaining({
              retry_count: 3,
            }),
          }),
        })
      );
    });

    it('allows scheduling up to MAX_RESCHEDULE_RETRIES times', async () => {
      // Test each retry count from 0 to MAX_RESCHEDULE_RETRIES - 1
      for (let i = 0; i < MAX_RESCHEDULE_RETRIES; i++) {
        mockTaskManager.schedule.mockClear();
        mockStorageClient.index.mockClear();
        mockStorageClient.get.mockResolvedValue({
          _source: createPersistedTask({ status: TaskStatus.Completed }),
        } as any);

        const currentTask = createPersistedTask({
          task: { params: { foo: 'bar' }, retry_count: i },
        });

        const result = await taskClient.reschedule(currentTask, { foo: 'bar' }, mockRequest);
        expect(result).toBe(true);
      }

      // Test that MAX_RESCHEDULE_RETRIES is rejected
      const maxedOutTask = createPersistedTask({
        task: { params: { foo: 'bar' }, retry_count: MAX_RESCHEDULE_RETRIES },
      });

      const result = await taskClient.reschedule(maxedOutTask, { foo: 'bar' }, mockRequest);
      expect(result).toBe(false);
    });
  });

  describe('schedule with retryCount', () => {
    let taskClient: TaskClient<'test-task-type'>;
    let mockLogger: jest.Mocked<Logger>;
    let mockStorageClient: jest.Mocked<TaskStorageClient>;
    let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
    let mockRequest: KibanaRequest;

    beforeEach(() => {
      mockLogger = createMockLogger();
      mockStorageClient = createMockStorageClient();
      mockTaskManager = createMockTaskManager();
      mockRequest = createMockRequest();

      taskClient = new TaskClient(mockTaskManager, mockStorageClient, mockLogger);

      mockStorageClient.get.mockResolvedValue({
        _source: createPersistedTask({ status: TaskStatus.Completed }),
      } as any);
    });

    it('stores retry_count when provided', async () => {
      await taskClient.schedule({
        task: {
          id: 'task-id',
          type: 'test-task-type',
          space: 'default',
        },
        params: { foo: 'bar' },
        request: mockRequest,
        retryCount: 3,
      });

      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            task: expect.objectContaining({
              params: { foo: 'bar' },
              retry_count: 3,
            }),
          }),
        })
      );
    });

    it('does not include retry_count when not provided', async () => {
      await taskClient.schedule({
        task: {
          id: 'task-id',
          type: 'test-task-type',
          space: 'default',
        },
        params: { foo: 'bar' },
        request: mockRequest,
      });

      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            task: {
              params: { foo: 'bar' },
              // No retry_count property
            },
          }),
        })
      );
    });
  });

  describe('MAX_RESCHEDULE_RETRIES constant', () => {
    it('is set to 5', () => {
      expect(MAX_RESCHEDULE_RETRIES).toBe(5);
    });
  });
});
