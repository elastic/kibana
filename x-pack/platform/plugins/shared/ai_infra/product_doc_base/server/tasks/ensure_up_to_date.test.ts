/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import type { InternalServices } from '../types';
import {
  registerEnsureUpToDateTaskDefinition,
  scheduleEnsureUpToDateTask,
  ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
  ENSURE_DOC_UP_TO_DATE_TASK_ID,
  ENSURE_DOC_UP_TO_DATE_TASK_ID_FORCED,
  ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL,
  ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL_FORCED,
} from './ensure_up_to_date';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

const scheduledAt = new Date('2026-09-17T10:00:00.000Z');
const requestedAt = scheduledAt.toISOString();

describe('EnsureUpToDate task', () => {
  let installProduct: jest.Mock;
  let getProductsToUpdate: jest.Mock;
  let ensureOpenApiSpecUpToDate: jest.Mock;
  let wasUninstalledSince: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTask: (state: Record<string, unknown>, at?: Date) => Promise<unknown>;

  beforeEach(() => {
    logger = loggerMock.create();
    installProduct = jest.fn().mockResolvedValue(true);
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
            installProduct,
            getProductsToUpdate,
            ensureOpenApiSpecUpToDate,
            wasUninstalledSince,
          },
        } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][ENSURE_DOC_UP_TO_DATE_TASK_TYPE];
    runTask = (state, at = scheduledAt) =>
      definition
        .createTaskRunner({
          taskInstance: {
            params: { inferenceId: '.elser', forceUpdate: true },
            state,
            scheduledAt: at,
          },
        } as unknown as RunContext)
        .run();
  });

  it('computes the update plan on the first run and handles the first item', async () => {
    const result = await runTask({});

    expect(getProductsToUpdate).toHaveBeenCalledWith({ inferenceId: '.elser', forceUpdate: true });
    expect(installProduct).toHaveBeenCalledWith({ productName: 'kibana', inferenceId: '.elser' });
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { requestedAt, remaining: ['security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });

  it('does not recompute the plan when remaining items of the same request are persisted', async () => {
    await runTask({ requestedAt, remaining: ['security', 'openapi'] });

    expect(getProductsToUpdate).not.toHaveBeenCalled();
    expect(installProduct).toHaveBeenCalledWith({ productName: 'security', inferenceId: '.elser' });
  });

  it('recomputes the plan when the task was requested again after the plan was persisted', async () => {
    const newRequest = new Date('2026-09-17T11:00:00.000Z');

    const result = await runTask({ requestedAt, remaining: ['openapi'] }, newRequest);

    expect(getProductsToUpdate).toHaveBeenCalledTimes(1);
    expect(installProduct).toHaveBeenCalledWith({ productName: 'kibana', inferenceId: '.elser' });
    expect(result).toEqual({
      state: { requestedAt: newRequest.toISOString(), remaining: ['security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });

  it('updates the OpenAPI spec as the last item and completes', async () => {
    const result = await runTask({ requestedAt, remaining: ['openapi'] });

    expect(installProduct).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).toHaveBeenCalledWith({
      inferenceId: '.elser',
      forceUpdate: true,
    });
    expect(result).toEqual({ state: {} });
  });

  it('only checks the OpenAPI spec when no product needs an update', async () => {
    getProductsToUpdate.mockResolvedValue([]);

    const result = await runTask({});

    expect(installProduct).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ state: {} });
  });

  it('runs each item under the shared install lock', async () => {
    await runTask({ requestedAt, remaining: ['openapi'] });

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.objectContaining({ metadata: expect.objectContaining({ item: 'openapi' }) })
    );
  });

  it('defers the run and keeps the computed plan when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask({});

    expect(installProduct).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { requestedAt, remaining: ['kibana', 'security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });

  it('stops when an uninstall was requested after this update, including the OpenAPI spec', async () => {
    wasUninstalledSince.mockResolvedValue(true);

    const result = await runTask({ requestedAt, remaining: ['openapi'] });

    expect(wasUninstalledSince).toHaveBeenCalledWith({ inferenceId: '.elser', since: scheduledAt });
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('retries the OpenAPI spec item with backoff instead of failing the run', async () => {
    ensureOpenApiSpecUpToDate.mockRejectedValue(new Error('no artifact'));

    const result = await runTask({ requestedAt, remaining: ['openapi'] });

    expect(result).toEqual({
      state: { requestedAt, remaining: ['openapi'], attempts: 1 },
      runAt: expect.any(Date),
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[openapi] failed'));
  });
});

describe('scheduleEnsureUpToDateTask', () => {
  it('ensures the task exists and runs it soon without deleting a task others may wait on', async () => {
    const taskManager = taskManagerMock.createStart();

    const taskId = await scheduleEnsureUpToDateTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
    });

    expect(taskId).toBe(ENSURE_DOC_UP_TO_DATE_TASK_ID);
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ENSURE_DOC_UP_TO_DATE_TASK_ID,
        params: { inferenceId: '.elser', forceUpdate: undefined },
        state: {},
      })
    );
    expect(taskManager.runSoon).toHaveBeenCalledWith(ENSURE_DOC_UP_TO_DATE_TASK_ID);
  });

  it.each([
    ['.elser', true, ENSURE_DOC_UP_TO_DATE_TASK_ID_FORCED],
    ['.multilingual-e5-small', false, ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL],
    ['.multilingual-e5-small', true, ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL_FORCED],
  ])(
    'uses a dedicated task for inferenceId=%s forceUpdate=%s',
    async (inferenceId, forceUpdate, expectedTaskId) => {
      const taskManager = taskManagerMock.createStart();

      const taskId = await scheduleEnsureUpToDateTask({
        taskManager,
        logger: loggerMock.create(),
        inferenceId,
        forceUpdate,
      });

      expect(taskId).toBe(expectedTaskId);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: expectedTaskId, params: { inferenceId, forceUpdate } })
      );
    }
  );
});
