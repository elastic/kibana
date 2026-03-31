/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { CONNECTOR_NOT_CONFIGURED_ERROR_CODE, TaskStatus } from '@kbn/streams-schema';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { cancellableTask } from './cancellable_task';
import { ConnectorNotConfiguredError } from '../streams/errors/connector_not_configured_error';
import type { TaskContext } from './task_definitions';
import type { PersistedTask } from './types';

const makePersistedTask = (
  status: PersistedTask['status'] = TaskStatus.InProgress
): PersistedTask =>
  ({
    id: 'task-1',
    type: 'streams:onboarding',
    status,
    space: 'default',
    created_at: new Date().toISOString(),
    task: { params: { _task: null, streamName: 'logs' } },
  } as unknown as PersistedTask);

const makeTaskClient = (status: PersistedTask['status'] = TaskStatus.InProgress) => ({
  get: jest.fn().mockResolvedValue(makePersistedTask(status)),
  fail: jest.fn().mockResolvedValue(undefined),
  markCanceled: jest.fn().mockResolvedValue(undefined),
});

const makeRunContext = (params: object = {}): RunContext =>
  ({
    taskInstance: {
      id: 'task-1',
      params: {
        _task: makePersistedTask(),
        streamName: 'logs',
        ...params,
      },
    },
    fakeRequest: {},
    abortController: new AbortController(),
  } as unknown as RunContext);

const makeTaskContext = (taskClient: ReturnType<typeof makeTaskClient>): TaskContext =>
  ({
    logger: loggerMock.create(),
    getScopedClients: jest.fn().mockResolvedValue({ taskClient }),
    telemetry: {},
  } as unknown as TaskContext);

describe('cancellableTask()', () => {
  it('calls taskClient.fail() with CONNECTOR_NOT_CONFIGURED_ERROR_CODE when run throws ConnectorNotConfiguredError', async () => {
    const taskClient = makeTaskClient();
    const runContext = makeRunContext();
    const taskContext = makeTaskContext(taskClient);

    const run = jest.fn().mockRejectedValue(new ConnectorNotConfiguredError());

    await expect(cancellableTask(run, runContext, taskContext)()).rejects.toThrow(
      ConnectorNotConfiguredError
    );

    expect(taskClient.fail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.any(String),
      CONNECTOR_NOT_CONFIGURED_ERROR_CODE
    );
  });

  it('calls taskClient.fail() with undefined errorCode when run throws a generic error', async () => {
    const taskClient = makeTaskClient();
    const runContext = makeRunContext();
    const taskContext = makeTaskContext(taskClient);

    const run = jest.fn().mockRejectedValue(new Error('something went wrong'));

    await expect(cancellableTask(run, runContext, taskContext)()).rejects.toThrow(
      'something went wrong'
    );

    expect(taskClient.fail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'something went wrong',
      undefined
    );
  });

  it('rethrows the original error after calling taskClient.fail()', async () => {
    const taskClient = makeTaskClient();
    const runContext = makeRunContext();
    const taskContext = makeTaskContext(taskClient);
    const originalError = new ConnectorNotConfiguredError();

    const run = jest.fn().mockRejectedValue(originalError);

    await expect(cancellableTask(run, runContext, taskContext)()).rejects.toBe(originalError);
  });

  it('still rethrows when taskClient.fail() itself throws', async () => {
    const taskClient = makeTaskClient();
    taskClient.fail.mockRejectedValue(new Error('storage unavailable'));
    const runContext = makeRunContext();
    const taskContext = makeTaskContext(taskClient);
    const originalError = new ConnectorNotConfiguredError();

    const run = jest.fn().mockRejectedValue(originalError);

    await expect(cancellableTask(run, runContext, taskContext)()).rejects.toBe(originalError);
  });
});
