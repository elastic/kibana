/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  TaskStatus,
  type ConcreteTaskInstance,
  type RunContext,
} from '@kbn/task-manager-plugin/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { DocumentationProduct, ResourceTypes } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import {
  registerInstallAllTaskDefinition,
  scheduleInstallAllTask,
  getInstallAllTaskStatus,
  INSTALL_ALL_TASK_TYPE,
} from './install_all';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

const allProducts = Object.values(DocumentationProduct);
const requestedAt = '2026-09-17T10:00:00.000Z';
const since = new Date(requestedAt);
const task = (fields: Partial<ConcreteTaskInstance>) => fields as ConcreteTaskInstance;

describe('InstallAll task', () => {
  let installProductIfNeeded: jest.Mock;
  let wasUninstalledSince: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTask: () => Promise<unknown>;

  beforeEach(() => {
    installProductIfNeeded = jest.fn().mockResolvedValue(true);
    wasUninstalledSince = jest.fn().mockResolvedValue(false);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    logger = loggerMock.create();
    const taskManager = taskManagerMock.createSetup();
    registerInstallAllTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({
          logger,
          packageInstaller: { installProductIfNeeded, wasUninstalledSince },
        } as unknown as InternalServices),
    });
    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][INSTALL_ALL_TASK_TYPE];
    runTask = () =>
      definition
        .createTaskRunner({
          taskInstance: { params: { inferenceId: '.elser', requestedAt }, state: {} },
        } as unknown as RunContext)
        .run();
  });

  it('installs every product under the shared install lock and completes', async () => {
    const result = await runTask();

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.objectContaining({ metadata: expect.objectContaining({ inferenceId: '.elser' }) })
    );
    expect(installProductIfNeeded.mock.calls.map(([{ productName }]) => productName)).toEqual(
      allProducts
    );
    expect(installProductIfNeeded).toHaveBeenCalledWith({
      productName: allProducts[0],
      inferenceId: '.elser',
      since,
    });
    expect(result).toEqual({ state: {} });
  });

  it('checks for a later product documentation uninstall before every product', async () => {
    await runTask();

    expect(wasUninstalledSince).toHaveBeenCalledTimes(allProducts.length);
    // Only product documentation counts: an OpenAPI-only uninstall must not cancel this install
    expect(wasUninstalledSince).toHaveBeenCalledWith({
      inferenceId: '.elser',
      since,
      resourceType: ResourceTypes.productDoc,
    });
  });

  it('stops installing once an uninstall requested after this install took effect', async () => {
    wasUninstalledSince.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const result = await runTask();

    expect(installProductIfNeeded).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ state: {} });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('superseded'));
  });

  it('propagates failures so Task Manager retries with the same request time', async () => {
    installProductIfNeeded.mockRejectedValueOnce(new Error('boom'));

    await expect(runTask()).rejects.toThrow('boom');
    expect(installProductIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('propagates status read failures instead of treating them as an uninstall', async () => {
    wasUninstalledSince.mockRejectedValue(new Error('es unavailable'));

    await expect(runTask()).rejects.toThrow('es unavailable');
    expect(installProductIfNeeded).not.toHaveBeenCalled();
  });

  it('defers the run without installing when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask();

    expect(installProductIfNeeded).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {}, runAt: expect.any(Date) });
  });
});

describe('scheduleInstallAllTask', () => {
  const pendingQuery = (statuses: TaskStatus[]) =>
    expect.objectContaining({
      query: {
        bool: {
          filter: [
            { term: { 'task.taskType': INSTALL_ALL_TASK_TYPE } },
            { term: { 'task.scope': 'productDoc:inference:default' } },
            { terms: { 'task.status': statuses } },
          ],
        },
      },
    });

  it('schedules a new task instance carrying the request time and inference scope', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
    taskManager.schedule.mockResolvedValue(task({ id: 'install-task-1' }));
    const before = Date.now();

    const taskId = await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
    });

    expect(taskId).toBe('install-task-1');
    expect(taskManager.schedule).toHaveBeenCalledWith({
      taskType: INSTALL_ALL_TASK_TYPE,
      params: { inferenceId: '.elser', requestedAt: expect.any(String) },
      state: {},
      scope: ['productDoc', 'productDoc:inference:default'],
    });
    const { requestedAt: stamped } = taskManager.schedule.mock.calls[0][0].params as {
      requestedAt: string;
    };
    expect(new Date(stamped).getTime()).toBeGreaterThanOrEqual(before);
    expect(taskManager.bulkRemove).not.toHaveBeenCalled();
  });

  it('reuses a pending install for the same inference id instead of installing twice', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({
      docs: [task({ id: 'install-task-1', status: TaskStatus.Running })],
      versionMap: new Map(),
    });

    const taskId = await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
    });

    expect(taskId).toBe('install-task-1');
    expect(taskManager.fetch).toHaveBeenCalledWith(
      pendingQuery([TaskStatus.Idle, TaskStatus.Claiming, TaskStatus.Running])
    );
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('schedules a new task for a forced request even when one is pending', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
    taskManager.schedule.mockResolvedValue(task({ id: 'install-task-2' }));

    await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
      force: true,
    });

    // only the failed-task cleanup lookup, no pending lookup
    expect(taskManager.fetch).toHaveBeenCalledTimes(1);
    expect(taskManager.fetch).toHaveBeenCalledWith(pendingQuery([TaskStatus.Failed]));
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
  });

  it('removes failed tasks of earlier requests before scheduling', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch
      .mockResolvedValueOnce({ docs: [], versionMap: new Map() }) // pending
      .mockResolvedValueOnce({
        docs: [task({ id: 'failed-1', status: TaskStatus.Failed })],
        versionMap: new Map(),
      });
    taskManager.schedule.mockResolvedValue(task({ id: 'install-task-3' }));

    await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
    });

    expect(taskManager.bulkRemove).toHaveBeenCalledWith(['failed-1']);
    expect(taskManager.bulkRemove.mock.invocationCallOrder[0]).toBeLessThan(
      taskManager.schedule.mock.invocationCallOrder[0]
    );
  });

  it('scopes tasks of non-default inference ids by inference id', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
    taskManager.schedule.mockResolvedValue(task({ id: 'install-task-4' }));

    await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.multilingual-e5-small',
    });

    expect(taskManager.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: ['productDoc', 'productDoc:inference:.multilingual-e5-small'],
      })
    );
  });
});

describe('getInstallAllTaskStatus', () => {
  it.each([
    ['pending', [task({ status: TaskStatus.Running })]],
    ['pending', [task({ status: TaskStatus.Failed }), task({ status: TaskStatus.Idle })]],
    ['failed', [task({ status: TaskStatus.Failed })]],
    ['none', []],
  ])('reports %s', async (expected, docs) => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs, versionMap: new Map() });

    await expect(getInstallAllTaskStatus({ taskManager, inferenceId: '.elser' })).resolves.toBe(
      expected
    );
  });
});
