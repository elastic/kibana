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
import { ResourceTypes } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import {
  registerEnsureUpToDateTaskDefinition,
  scheduleEnsureUpToDateTask,
  ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
} from './ensure_up_to_date';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

const requestedAt = '2026-09-17T10:00:00.000Z';
const since = new Date(requestedAt);
const task = (fields: Partial<ConcreteTaskInstance>) => fields as ConcreteTaskInstance;

describe('EnsureUpToDate task', () => {
  let updateProductIfNeeded: jest.Mock;
  let getProductsToUpdate: jest.Mock;
  let ensureOpenApiSpecUpToDate: jest.Mock;
  let wasUninstalledSince: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTask: () => Promise<unknown>;

  beforeEach(() => {
    logger = loggerMock.create();
    updateProductIfNeeded = jest.fn().mockResolvedValue(true);
    getProductsToUpdate = jest.fn().mockResolvedValue(['kibana', 'security']);
    ensureOpenApiSpecUpToDate = jest.fn().mockResolvedValue(undefined);
    wasUninstalledSince = jest.fn().mockResolvedValue(false);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    const taskManager = taskManagerMock.createSetup();
    registerEnsureUpToDateTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({
          logger,
          packageInstaller: {
            updateProductIfNeeded,
            getProductsToUpdate,
            ensureOpenApiSpecUpToDate,
            wasUninstalledSince,
          },
        } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][ENSURE_DOC_UP_TO_DATE_TASK_TYPE];
    runTask = () =>
      definition
        .createTaskRunner({
          taskInstance: {
            params: { inferenceId: '.elser', forceUpdate: true, requestedAt },
            state: {},
          },
        } as unknown as RunContext)
        .run();
  });

  it('updates the planned products and then the OpenAPI spec under the shared lock', async () => {
    const result = await runTask();

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.anything()
    );
    expect(getProductsToUpdate).toHaveBeenCalledWith({ inferenceId: '.elser', forceUpdate: true });
    expect(updateProductIfNeeded.mock.calls.map(([{ productName }]) => productName)).toEqual([
      'kibana',
      'security',
    ]);
    expect(updateProductIfNeeded).toHaveBeenCalledWith({
      productName: 'kibana',
      inferenceId: '.elser',
      forceUpdate: true,
      since,
    });
    expect(ensureOpenApiSpecUpToDate).toHaveBeenCalledWith({
      inferenceId: '.elser',
      forceUpdate: true,
      since,
    });
    expect(result).toEqual({ state: {} });
  });

  it('only checks the OpenAPI spec when no product needs an update', async () => {
    getProductsToUpdate.mockResolvedValue([]);

    await runTask();

    expect(updateProductIfNeeded).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).toHaveBeenCalledTimes(1);
  });

  it('checks product items against product documentation uninstalls and the spec against OpenAPI uninstalls', async () => {
    await runTask();

    expect(wasUninstalledSince).toHaveBeenNthCalledWith(1, {
      inferenceId: '.elser',
      since,
      resourceType: ResourceTypes.productDoc,
    });
    expect(wasUninstalledSince).toHaveBeenLastCalledWith({
      inferenceId: '.elser',
      since,
      resourceType: ResourceTypes.openapiSpec,
    });
  });

  it('stops when a product documentation uninstall was requested after this update', async () => {
    wasUninstalledSince.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await runTask();

    expect(updateProductIfNeeded).toHaveBeenCalledTimes(1);
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
  });

  it('skips the OpenAPI spec when it was uninstalled after this update was requested', async () => {
    wasUninstalledSince.mockImplementation(
      async ({ resourceType }) => resourceType === ResourceTypes.openapiSpec
    );

    await runTask();

    expect(updateProductIfNeeded).toHaveBeenCalledTimes(2);
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
  });

  it('propagates failures so Task Manager retries', async () => {
    ensureOpenApiSpecUpToDate.mockRejectedValue(new Error('no artifact'));

    await expect(runTask()).rejects.toThrow('no artifact');
  });

  it('defers the run when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask();

    expect(getProductsToUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {}, runAt: expect.any(Date) });
  });
});

describe('scheduleEnsureUpToDateTask', () => {
  it('schedules a new task instance per request with its own params', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
    taskManager.schedule.mockResolvedValue(task({ id: 'update-task-1' }));

    const taskId = await scheduleEnsureUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.multilingual-e5-small',
      forceUpdate: true,
    });

    expect(taskId).toBe('update-task-1');
    expect(taskManager.schedule).toHaveBeenCalledWith({
      taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
      params: {
        inferenceId: '.multilingual-e5-small',
        forceUpdate: true,
        requestedAt: expect.any(String),
      },
      state: {},
      scope: ['productDoc', 'productDoc:inference:.multilingual-e5-small'],
    });
  });

  it('reuses a pending update with the same forceUpdate flag', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({
      docs: [
        task({ id: 'forced-1', status: TaskStatus.Idle, params: { forceUpdate: true } }),
        task({ id: 'plain-1', status: TaskStatus.Running, params: {} }),
      ],
      versionMap: new Map(),
    });

    await expect(
      scheduleEnsureUpToDateTask({
        taskManager,
        logger: loggerMock.create(),
        inferenceId: '.elser',
      })
    ).resolves.toBe('plain-1');
    await expect(
      scheduleEnsureUpToDateTask({
        taskManager,
        logger: loggerMock.create(),
        inferenceId: '.elser',
        forceUpdate: true,
      })
    ).resolves.toBe('forced-1');
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('does not let an ordinary pending update absorb a forced request', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({
      docs: [task({ id: 'plain-1', status: TaskStatus.Running, params: {} })],
      versionMap: new Map(),
    });
    taskManager.schedule.mockResolvedValue(task({ id: 'forced-2' }));

    await expect(
      scheduleEnsureUpToDateTask({
        taskManager,
        logger: loggerMock.create(),
        inferenceId: '.elser',
        forceUpdate: true,
      })
    ).resolves.toBe('forced-2');
  });
});
