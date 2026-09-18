/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConcreteTaskInstance, RunContext } from '@kbn/task-manager-plugin/server';
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

describe('EnsureUpToDate task', () => {
  let updateProductIfNeeded: jest.Mock;
  let getProductsToUpdate: jest.Mock;
  let ensureOpenApiSpecUpToDate: jest.Mock;
  let wasUninstalledSince: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTask: (state: Record<string, unknown>) => Promise<unknown>;

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
    runTask = (state) =>
      definition
        .createTaskRunner({
          taskInstance: {
            params: { inferenceId: '.elser', forceUpdate: true, requestedAt },
            state,
          },
        } as unknown as RunContext)
        .run();
  });

  it('computes the update plan on the first run and handles the first item', async () => {
    const result = await runTask({});

    expect(getProductsToUpdate).toHaveBeenCalledWith({ inferenceId: '.elser', forceUpdate: true });
    expect(updateProductIfNeeded).toHaveBeenCalledWith({
      productName: 'kibana',
      inferenceId: '.elser',
      forceUpdate: true,
      since,
    });
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { remaining: ['security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });

  it('does not recompute the plan when remaining items are persisted', async () => {
    await runTask({ remaining: ['security', 'openapi'] });

    expect(getProductsToUpdate).not.toHaveBeenCalled();
    expect(updateProductIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ productName: 'security', since })
    );
  });

  it('updates the OpenAPI spec as the last item and completes', async () => {
    const result = await runTask({ remaining: ['openapi'] });

    expect(updateProductIfNeeded).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).toHaveBeenCalledWith({
      inferenceId: '.elser',
      forceUpdate: true,
      since,
    });
    expect(result).toEqual({ state: {} });
  });

  it('only checks the OpenAPI spec when no product needs an update', async () => {
    getProductsToUpdate.mockResolvedValue([]);

    const result = await runTask({});

    expect(updateProductIfNeeded).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ state: {} });
  });

  it('runs each item under the shared install lock', async () => {
    await runTask({ remaining: ['openapi'] });

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.objectContaining({ metadata: expect.objectContaining({ item: 'openapi' }) })
    );
  });

  it('defers the run and keeps the computed plan when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask({});

    expect(updateProductIfNeeded).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { remaining: ['kibana', 'security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });

  it('stops the OpenAPI item when the OpenAPI spec was uninstalled after this update was requested', async () => {
    wasUninstalledSince.mockResolvedValue(true);

    const result = await runTask({ remaining: ['openapi'] });

    expect(wasUninstalledSince).toHaveBeenCalledWith({
      inferenceId: '.elser',
      since,
      resourceType: ResourceTypes.openapiSpec,
    });
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('checks product items against product documentation uninstalls only', async () => {
    await runTask({ remaining: ['security', 'openapi'] });

    expect(wasUninstalledSince).toHaveBeenCalledWith({
      inferenceId: '.elser',
      since,
      resourceType: ResourceTypes.productDoc,
    });
  });

  it('retries the OpenAPI spec item with backoff instead of failing the run', async () => {
    ensureOpenApiSpecUpToDate.mockRejectedValue(new Error('no artifact'));

    const result = await runTask({ remaining: ['openapi'] });

    expect(result).toEqual({
      state: { remaining: ['openapi'], attempts: 1 },
      runAt: expect.any(Date),
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[openapi] failed'));
  });
});

describe('scheduleEnsureUpToDateTask', () => {
  it('schedules a new task instance per request with its own params', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.schedule.mockResolvedValue({ id: 'update-task-1' } as ConcreteTaskInstance);

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
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });
});
