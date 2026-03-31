/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { TaskStatus, CONNECTOR_NOT_CONFIGURED_ERROR_CODE } from '@kbn/streams-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskClient } from './task_client';
import type { TaskStorageClient } from './storage';
import type { PersistedTask } from './types';
import { CancellationInProgressError } from './cancellation_in_progress_error';

const makeStoredTask = (status: PersistedTask['status'], extra: Partial<PersistedTask> = {}) =>
  ({
    id: 'task-1',
    type: 'streams:onboarding',
    status,
    space: 'default',
    created_at: new Date().toISOString(),
    task: {
      params: {},
      ...(status === TaskStatus.Failed ? { error: 'some error' } : {}),
    },
    ...extra,
  } as PersistedTask);

const makeTaskManagerStart = (): jest.Mocked<TaskManagerStartContract> => ({
  fetch: jest.fn(),
  get: jest.fn(),
  bulkGet: jest.fn(),
  aggregate: jest.fn(),
  remove: jest.fn(),
  bulkRemove: jest.fn(),
  schedule: jest.fn().mockResolvedValue(undefined),
  runSoon: jest.fn(),
  ensureScheduled: jest.fn(),
  removeIfExists: jest.fn().mockResolvedValue(undefined),
  bulkUpdateSchedules: jest.fn(),
  bulkSchedule: jest.fn(),
  bulkDisable: jest.fn(),
  bulkEnable: jest.fn(),
  getRegisteredTypes: jest.fn(),
  bulkUpdateState: jest.fn(),
  registerEncryptedSavedObjectsClient: jest.fn(),
  registerApiKeyInvalidateFn: jest.fn(),
});

const makeStorageClient = (stored: PersistedTask): jest.Mocked<TaskStorageClient> =>
  ({
    get: jest.fn().mockResolvedValue({ _source: stored }),
    index: jest.fn().mockResolvedValue({}),
    search: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<TaskStorageClient>);

const makeScheduleRequest = () => ({
  task: {
    id: 'task-1',
    type: 'streams:onboarding' as const,
    space: 'default',
  },
  params: {},
  request: {} as unknown as KibanaRequest,
});

describe('TaskClient.schedule()', () => {
  it('calls removeIfExists before scheduling when storedTask.status is Failed', async () => {
    const stored = makeStoredTask(TaskStatus.Failed);
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await client.schedule(makeScheduleRequest());

    expect(taskManagerStart.removeIfExists).toHaveBeenCalledWith('task-1');
    expect(taskManagerStart.schedule).toHaveBeenCalled();
  });

  it('does NOT call removeIfExists when storedTask.status is NotStarted', async () => {
    const stored = makeStoredTask(TaskStatus.NotStarted);
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await client.schedule(makeScheduleRequest());

    expect(taskManagerStart.removeIfExists).not.toHaveBeenCalled();
  });

  it('does NOT call removeIfExists when storedTask.status is Completed', async () => {
    const stored = makeStoredTask(TaskStatus.Completed);
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await client.schedule(makeScheduleRequest());

    expect(taskManagerStart.removeIfExists).not.toHaveBeenCalled();
  });

  it('logs a warning and continues when removeIfExists throws', async () => {
    const stored = makeStoredTask(TaskStatus.Failed);
    const taskManagerStart = makeTaskManagerStart();
    taskManagerStart.removeIfExists.mockRejectedValue(new Error('ES unavailable'));
    const storageClient = makeStorageClient(stored);
    const logger = loggerMock.create();
    const client = new TaskClient(taskManagerStart, storageClient, logger);

    await expect(client.schedule(makeScheduleRequest())).resolves.not.toThrow();
    expect(logger.warn).toHaveBeenCalled();
    expect(taskManagerStart.schedule).toHaveBeenCalled();
  });

  it('propagates non-removal errors from taskManagerStart.schedule', async () => {
    const stored = makeStoredTask(TaskStatus.NotStarted);
    const taskManagerStart = makeTaskManagerStart();
    taskManagerStart.schedule.mockRejectedValue(new Error('Unexpected error'));
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await expect(client.schedule(makeScheduleRequest())).rejects.toThrow('Unexpected error');
  });

  it('throws CancellationInProgressError when storedTask.status is BeingCanceled', async () => {
    const stored = makeStoredTask(TaskStatus.BeingCanceled);
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await expect(client.schedule(makeScheduleRequest())).rejects.toThrow(
      CancellationInProgressError
    );
    expect(taskManagerStart.removeIfExists).not.toHaveBeenCalled();
    expect(taskManagerStart.schedule).not.toHaveBeenCalled();
  });
});

describe('TaskClient.fail()', () => {
  it('persists errorCode alongside error message', async () => {
    const stored = makeStoredTask(TaskStatus.InProgress);
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await client.fail(stored, {}, 'connector error message', CONNECTOR_NOT_CONFIGURED_ERROR_CODE);

    expect(storageClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          status: TaskStatus.Failed,
          task: expect.objectContaining({
            error: 'connector error message',
            errorCode: CONNECTOR_NOT_CONFIGURED_ERROR_CODE,
          }),
        }),
      })
    );
  });

  it('persists undefined errorCode when not provided', async () => {
    const stored = makeStoredTask(TaskStatus.InProgress);
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    await client.fail(stored, {}, 'generic error');

    expect(storageClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          task: expect.objectContaining({
            error: 'generic error',
            errorCode: undefined,
          }),
        }),
      })
    );
  });
});

describe('TaskClient.getStatus()', () => {
  it('returns errorCode from a failed task', async () => {
    const stored: PersistedTask = {
      id: 'task-1',
      type: 'streams:onboarding',
      status: TaskStatus.Failed,
      space: 'default',
      created_at: new Date().toISOString(),
      task: {
        params: {},
        error: 'connector error',
        errorCode: CONNECTOR_NOT_CONFIGURED_ERROR_CODE,
      },
    };
    const taskManagerStart = makeTaskManagerStart();
    const storageClient = makeStorageClient(stored);
    const client = new TaskClient(taskManagerStart, storageClient, loggerMock.create());

    const result = await client.getStatus('task-1');

    expect(result).toEqual({
      status: TaskStatus.Failed,
      error: 'connector error',
      errorCode: CONNECTOR_NOT_CONFIGURED_ERROR_CODE,
    });
  });
});
