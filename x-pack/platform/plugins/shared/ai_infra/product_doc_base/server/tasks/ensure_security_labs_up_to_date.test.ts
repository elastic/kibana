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
  let taskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let runTaskWith: (params: Record<string, unknown>) => Promise<unknown>;
  let runTask: () => Promise<unknown>;

  beforeEach(() => {
    ensureSecurityLabsUpToDate = jest.fn().mockResolvedValue(undefined);
    getRepositoryVersion = jest.fn().mockResolvedValue(undefined);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    logger = loggerMock.create();
    taskManagerStart = taskManagerMock.createStart();
    taskManagerStart.get.mockResolvedValue({ state: {} } as unknown as ConcreteTaskInstance);
    const taskManager = taskManagerMock.createSetup();
    registerEnsureSecurityLabsUpToDateTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({
          logger,
          taskManager: taskManagerStart,
          packageInstaller: { ensureSecurityLabsUpToDate, getRepositoryVersion },
        } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][
        ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE
      ];
    runTaskWith = (params) =>
      definition
        .createTaskRunner({
          taskInstance: { id: 'security-labs-task', params, state: {} },
        } as unknown as RunContext)
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

  it('completes at once instead of deferring when it was already superseded', async () => {
    getRepositoryVersion.mockResolvedValue('2026-10-01T00:00:00.000Z');
    taskManagerStart.get.mockResolvedValue({
      state: { superseded: true },
    } as unknown as ConcreteTaskInstance);

    const result = await runTaskWith({
      inferenceId: '.elser',
      forceUpdate: true,
      requestedAt: new Date().toISOString(),
      repositoryVersion: '2026-10-12T00:00:00.000Z',
    });

    expect(taskManagerStart.get).toHaveBeenCalledWith('security-labs-task');
    expect(getRepositoryVersion).not.toHaveBeenCalled();
    expect(withLock).not.toHaveBeenCalled();
    expect(ensureSecurityLabsUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('re-reads its task under the lock and stops when it was marked superseded after being claimed', async () => {
    taskManagerStart.get
      .mockResolvedValueOnce({ state: {} } as unknown as ConcreteTaskInstance)
      .mockResolvedValue({ state: { superseded: true } } as unknown as ConcreteTaskInstance);

    const result = await runTask();

    expect(withLock).toHaveBeenCalledTimes(1);
    expect(taskManagerStart.get).toHaveBeenCalledTimes(2);
    expect(ensureSecurityLabsUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
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
    expect(taskManager.get).toHaveBeenCalledWith(versionedId);
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
  });

  it('gives a forced request its own task id so an ordinary pending one cannot swallow it', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });

    await scheduleEnsureSecurityLabsUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
      forceUpdate: true,
      repositoryVersion: '2026-10-12T00:00:00.000Z',
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${versionedId}:force`,
        params: expect.objectContaining({ forceUpdate: true }),
      })
    );
    expect(taskManager.runSoon).toHaveBeenCalledWith(`${versionedId}:force`);
  });

  it('revives a superseded task that has the target id before ensuring it', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
    taskManager.get.mockResolvedValue({
      id: versionedId,
      state: { superseded: true },
    } as unknown as ConcreteTaskInstance);

    await scheduleEnsureSecurityLabsUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
      repositoryVersion: '2026-10-12T00:00:00.000Z',
    });

    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith([versionedId], expect.any(Function));
    const [, mapState] = taskManager.bulkUpdateState.mock.calls[0];
    expect(mapState({ superseded: true }, versionedId)).toEqual({ superseded: false });
    expect(taskManager.bulkUpdateState.mock.invocationCallOrder[0]).toBeLessThan(
      taskManager.ensureScheduled.mock.invocationCallOrder[0]
    );
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

  it('carries a superseded forced update into the new task', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({
      docs: [
        task({
          id: `${ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID}:2026-10-01T00:00:00.000Z`,
          status: TaskStatus.Idle,
          params: { repositoryVersion: '2026-10-01T00:00:00.000Z', forceUpdate: true },
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

    expect(taskManager.bulkRemove).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${versionedId}:force`,
        params: expect.objectContaining({ forceUpdate: true }),
      })
    );
  });

  it('marks superseded tasks only after the new task is ensured', async () => {
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
    taskManager.ensureScheduled.mockRejectedValue(new Error('es unavailable'));

    await expect(
      scheduleEnsureSecurityLabsUpToDateTask({
        taskManager,
        logger: loggerMock.create(),
        inferenceId: '.elser',
        repositoryVersion: '2026-10-12T00:00:00.000Z',
      })
    ).rejects.toThrow('es unavailable');
    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
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
    expect(taskManager.bulkUpdateState.mock.calls[0][0]).toEqual([
      `${ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID}:2026-10-01T00:00:00.000Z`,
    ]);
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: versionedId })
    );
    expect(taskManager.ensureScheduled.mock.invocationCallOrder[0]).toBeLessThan(
      taskManager.bulkUpdateState.mock.invocationCallOrder[0]
    );
  });
});
