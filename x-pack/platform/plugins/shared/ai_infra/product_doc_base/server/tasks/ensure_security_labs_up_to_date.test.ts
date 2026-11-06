/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  TaskStatus,
  type ConcreteTaskInstance,
  type RunContext,
} from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { LockAcquisitionError } from '@kbn/lock-manager';
import type { InternalServices } from '../types';
import {
  registerEnsureSecurityLabsUpToDateTaskDefinition,
  scheduleEnsureSecurityLabsUpToDateTask,
  ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID,
  ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE,
} from './ensure_security_labs_up_to_date';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

describe('EnsureSecurityLabsUpToDate task', () => {
  let ensureSecurityLabsUpToDate: jest.Mock;
  let getRepositoryVersion: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTaskWith: (params: Record<string, unknown>) => Promise<unknown>;
  let runTask: () => Promise<unknown>;

  beforeEach(() => {
    ensureSecurityLabsUpToDate = jest.fn().mockResolvedValue(undefined);
    getRepositoryVersion = jest.fn().mockResolvedValue(undefined);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    logger = loggerMock.create();
    const taskManager = taskManagerMock.createSetup();
    registerEnsureSecurityLabsUpToDateTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({
          logger,
          packageInstaller: { ensureSecurityLabsUpToDate, getRepositoryVersion },
        } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][
        ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE
      ];
    runTaskWith = (params) =>
      definition
        .createTaskRunner({ taskInstance: { params, state: {} } } as unknown as RunContext)
        .run();
    runTask = () => runTaskWith({ inferenceId: '.elser', forceUpdate: true });
  });

  it('updates Security Labs under the shared install lock', async () => {
    const result = await runTask();

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.anything()
    );
    expect(ensureSecurityLabsUpToDate).toHaveBeenCalledWith({
      inferenceId: '.elser',
      forceUpdate: true,
    });
    expect(result).toEqual({ state: {} });
  });

  it('defers the run when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask();

    expect(ensureSecurityLabsUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {}, runAt: expect.any(Date) });
  });

  it('defers a recent request made against a newer repository than this node has', async () => {
    getRepositoryVersion.mockResolvedValue('2026-10-01T00:00:00.000Z');

    const result = await runTaskWith({
      inferenceId: '.elser',
      requestedAt: new Date().toISOString(),
      repositoryVersion: '2026-10-12T00:00:00.000Z',
    });

    expect(withLock).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {}, runAt: expect.any(Date) });
  });
});

describe('scheduleEnsureSecurityLabsUpToDateTask', () => {
  const task = (fields: Partial<ConcreteTaskInstance>) => fields as ConcreteTaskInstance;
  const versionedId = `${ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID}:2026-10-12T00:00:00.000Z`;

  it('ensures a one-shot task per repository version carrying the request time and version', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });

    await scheduleEnsureSecurityLabsUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
      repositoryVersion: '2026-10-12T00:00:00.000Z',
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: versionedId,
      taskType: ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE,
      params: {
        inferenceId: '.elser',
        forceUpdate: undefined,
        requestedAt: expect.any(String),
        repositoryVersion: '2026-10-12T00:00:00.000Z',
      },
      state: {},
      scope: ['productDoc', 'productDoc:inference:default'],
    });
    expect(taskManager.runSoon).toHaveBeenCalledWith(versionedId);
    expect(taskManager.get).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.bulkRemove).not.toHaveBeenCalled();
  });

  it('keeps the plain singleton id for a remote repository', async () => {
    const taskManager = taskManagerMock.createStart();

    await scheduleEnsureSecurityLabsUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID })
    );
    expect(taskManager.fetch).not.toHaveBeenCalled();
  });

  it('supersedes waiting tasks of older repository versions without touching a running one', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({
      docs: [
        task({
          id: `${ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID}:2026-10-01T00:00:00.000Z`,
          status: TaskStatus.Idle,
          params: { repositoryVersion: '2026-10-01T00:00:00.000Z' },
        }),
      ],
      versionMap: new Map(),
    });

    await scheduleEnsureSecurityLabsUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
      repositoryVersion: '2026-10-12T00:00:00.000Z',
    });

    expect(taskManager.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { terms: { 'task.status': [TaskStatus.Idle, TaskStatus.Claiming] } },
            ]),
          }),
        }),
      })
    );
    expect(taskManager.bulkRemove).toHaveBeenCalledWith([
      `${ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID}:2026-10-01T00:00:00.000Z`,
    ]);
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: versionedId })
    );
  });
});
