/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { isUnrecoverableError, type RunContext } from '@kbn/task-manager-plugin/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { DocumentationProduct, ResourceTypes } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import {
  registerInstallAllTaskDefinition,
  scheduleInstallAllTask,
  INSTALL_ALL_TASK_TYPE,
  INSTALL_ALL_TASK_ID,
  INSTALL_ALL_TASK_ID_MULTILINGUAL,
} from './install_all';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';
import { MAX_INSTALL_ITEM_RETRIES } from './utils';

const allProducts = Object.values(DocumentationProduct);
const requestedAt = '2026-09-17T10:00:00.000Z';
// Task Manager copies the `runAt` a run returned into `scheduledAt` when claiming the next run
const nextRunAt = '2026-09-17T10:05:00.000Z';
const continuation = (state: Record<string, unknown>) => ({ requestedAt, nextRunAt, ...state });

interface RunOptions {
  scheduledAt?: string;
  attempts?: number;
}

describe('InstallAll task', () => {
  let installProduct: jest.Mock;
  let wasUninstalledSince: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTask: (state: Record<string, unknown>, options?: RunOptions) => Promise<unknown>;

  beforeEach(() => {
    installProduct = jest.fn().mockResolvedValue(true);
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
          packageInstaller: { installProduct, wasUninstalledSince },
        } as unknown as InternalServices),
    });
    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][INSTALL_ALL_TASK_TYPE];
    runTask = (state, { scheduledAt = nextRunAt, attempts = 1 } = {}) =>
      definition
        .createTaskRunner({
          taskInstance: {
            params: { inferenceId: '.elser' },
            state,
            scheduledAt: new Date(scheduledAt),
            attempts,
          },
        } as unknown as RunContext)
        .run();
  });

  it('installs only the first product on a new request and records the request time', async () => {
    const result = await runTask({}, { scheduledAt: requestedAt });

    expect(installProduct).toHaveBeenCalledTimes(1);
    expect(installProduct).toHaveBeenCalledWith({
      productName: allProducts[0],
      inferenceId: '.elser',
    });
    expect(result).toEqual({
      state: { requestedAt, nextRunAt: expect.any(String), remaining: allProducts.slice(1) },
      runAt: expect.any(Date),
    });
  });

  it('continues the plan when claimed for the run it scheduled', async () => {
    const result = await runTask(continuation({ remaining: ['security', 'observability'] }));

    expect(installProduct).toHaveBeenCalledWith({ productName: 'security', inferenceId: '.elser' });
    expect(result).toEqual({
      state: { requestedAt, nextRunAt: expect.any(String), remaining: ['observability'] },
      runAt: expect.any(Date),
    });
  });

  it('continues the plan when Task Manager retries a failed run', async () => {
    await runTask(continuation({ remaining: ['security'] }), {
      scheduledAt: '2026-09-17T10:06:00.000Z',
      attempts: 2,
    });

    expect(installProduct).toHaveBeenCalledWith({ productName: 'security', inferenceId: '.elser' });
  });

  it('starts over when the task was requested again (runSoon) after the plan was persisted', async () => {
    const newRequest = '2026-09-17T11:00:00.000Z';

    const result = await runTask(continuation({ remaining: ['observability'], attempts: 3 }), {
      scheduledAt: newRequest,
    });

    expect(installProduct).toHaveBeenCalledWith({
      productName: allProducts[0],
      inferenceId: '.elser',
    });
    expect(wasUninstalledSince).toHaveBeenCalledWith({
      inferenceId: '.elser',
      since: new Date(newRequest),
      resourceType: ResourceTypes.productDoc,
    });
    expect(result).toEqual({
      state: {
        requestedAt: newRequest,
        nextRunAt: expect.any(String),
        remaining: allProducts.slice(1),
      },
      runAt: expect.any(Date),
    });
  });

  it('completes without rescheduling after the last product', async () => {
    const result = await runTask(continuation({ remaining: ['observability'] }));

    expect(result).toEqual({ state: {} });
  });

  it('ignores unknown product names in the persisted state', async () => {
    const result = await runTask(continuation({ remaining: ['not-a-product'] }));

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('checks for a product documentation uninstall newer than the request before every product', async () => {
    await runTask(continuation({ remaining: ['security'] }));

    // Only product documentation counts: an OpenAPI-only uninstall must not cancel this install
    expect(wasUninstalledSince).toHaveBeenCalledWith({
      inferenceId: '.elser',
      since: new Date(requestedAt),
      resourceType: ResourceTypes.productDoc,
    });
  });

  it('stops before the first product when an uninstall acquired the lock first', async () => {
    wasUninstalledSince.mockResolvedValue(true);

    const result = await runTask({}, { scheduledAt: requestedAt });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('stops between products when an uninstall was requested after this install', async () => {
    wasUninstalledSince.mockResolvedValue(true);

    const result = await runTask(continuation({ remaining: ['security', 'observability'] }));

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('propagates status read failures so Task Manager retries instead of completing', async () => {
    wasUninstalledSince.mockRejectedValue(new Error('es unavailable'));

    const error = (await runTask(continuation({ remaining: ['security'] })).catch(
      (e) => e
    )) as Error;

    expect(error.message).toBe('es unavailable');
    expect(isUnrecoverableError(error)).toBe(false);
    expect(installProduct).not.toHaveBeenCalled();
  });

  it('installs each product under the shared install lock', async () => {
    await runTask(continuation({ remaining: ['kibana'] }));

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.objectContaining({ metadata: expect.objectContaining({ item: 'kibana' }) })
    );
  });

  it('defers the run without installing when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask(continuation({ remaining: ['kibana', 'security'], attempts: 2 }));

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: {
        requestedAt,
        nextRunAt: expect.any(String),
        remaining: ['kibana', 'security'],
        attempts: 2,
      },
      runAt: expect.any(Date),
    });
  });

  it('retries a failing product with exponential backoff, keeping the same item', async () => {
    installProduct.mockRejectedValue(new Error('boom'));
    const now = Date.now();

    const first = (await runTask(continuation({ remaining: ['kibana', 'security'] }))) as {
      state: Record<string, unknown>;
      runAt: Date;
    };
    expect(first.state).toEqual({
      requestedAt,
      nextRunAt: first.runAt.toISOString(),
      remaining: ['kibana', 'security'],
      attempts: 1,
    });
    expect(first.runAt.getTime() - now).toBeGreaterThanOrEqual(30_000);
    expect(first.runAt.getTime() - now).toBeLessThan(60_000);

    const third = (await runTask(
      { ...first.state, attempts: 2 },
      { scheduledAt: first.runAt.toISOString() }
    )) as { state: Record<string, unknown>; runAt: Date };
    expect(third.state).toEqual({
      requestedAt,
      nextRunAt: third.runAt.toISOString(),
      remaining: ['kibana', 'security'],
      attempts: 3,
    });
    expect(third.runAt.getTime() - now).toBeGreaterThanOrEqual(120_000);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('fails the task without further retries once the maximum number of retries is exhausted', async () => {
    installProduct.mockRejectedValue(new Error('boom'));

    const error = (await runTask(
      continuation({ remaining: ['kibana', 'security'], attempts: MAX_INSTALL_ITEM_RETRIES })
    ).catch((e) => e)) as Error;

    expect(error.message).toBe('boom');
    expect(isUnrecoverableError(error)).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Giving up'));
  });

  it('resets the attempt counter once the item succeeds', async () => {
    const result = await runTask(continuation({ remaining: ['kibana', 'security'], attempts: 2 }));

    expect(result).toEqual({
      state: { requestedAt, nextRunAt: expect.any(String), remaining: ['security'] },
      runAt: expect.any(Date),
    });
  });
});

describe('scheduleInstallAllTask', () => {
  it('ensures the task exists and runs it soon without deleting a task others may wait on', async () => {
    const taskManager = taskManagerMock.createStart();

    const taskId = await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.elser',
    });

    expect(taskId).toBe(INSTALL_ALL_TASK_ID);
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: INSTALL_ALL_TASK_ID,
        params: { inferenceId: '.elser' },
        state: {},
      })
    );
    expect(taskManager.runSoon).toHaveBeenCalledWith(INSTALL_ALL_TASK_ID);
  });

  it('uses the multilingual task id for non-default inference ids', async () => {
    const taskManager = taskManagerMock.createStart();

    const taskId = await scheduleInstallAllTask({
      taskManager,
      logger: loggerMock.create(),
      inferenceId: '.multilingual-e5-small',
    });

    expect(taskId).toBe(INSTALL_ALL_TASK_ID_MULTILINGUAL);
    expect(taskManager.runSoon).toHaveBeenCalledWith(INSTALL_ALL_TASK_ID_MULTILINGUAL);
  });
});
