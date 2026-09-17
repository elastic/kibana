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
import { DocumentationProduct } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import { registerInstallAllTaskDefinition, INSTALL_ALL_TASK_TYPE } from './install_all';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';
import { MAX_INSTALL_ITEM_RETRIES } from './utils';

const allProducts = Object.values(DocumentationProduct);
const scheduledAt = new Date('2026-09-17T10:00:00.000Z');

describe('InstallAll task', () => {
  let installProduct: jest.Mock;
  let wasUninstalledSince: jest.Mock;
  let withLock: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;
  let runTask: (state: Record<string, unknown>) => Promise<unknown>;

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
    runTask = (state) =>
      definition
        .createTaskRunner({
          taskInstance: { params: { inferenceId: '.elser' }, state, scheduledAt },
        } as unknown as RunContext)
        .run();
  });

  it('installs only the first product on the first run and schedules the next run', async () => {
    const result = await runTask({});

    expect(installProduct).toHaveBeenCalledTimes(1);
    expect(installProduct).toHaveBeenCalledWith({
      productName: allProducts[0],
      inferenceId: '.elser',
    });
    expect(result).toEqual({
      state: { remaining: allProducts.slice(1) },
      runAt: expect.any(Date),
    });
  });

  it('continues from the persisted remaining products', async () => {
    const result = await runTask({ remaining: ['security', 'observability'] });

    expect(installProduct).toHaveBeenCalledWith({ productName: 'security', inferenceId: '.elser' });
    expect(result).toEqual({ state: { remaining: ['observability'] }, runAt: expect.any(Date) });
  });

  it('completes without rescheduling after the last product', async () => {
    const result = await runTask({ remaining: ['observability'] });

    expect(result).toEqual({ state: {} });
  });

  it('ignores unknown product names in the persisted state', async () => {
    const result = await runTask({ remaining: ['not-a-product'] });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('checks for a later uninstall since the install was requested before every product', async () => {
    await runTask({ remaining: ['security'] });

    expect(wasUninstalledSince).toHaveBeenCalledWith({ inferenceId: '.elser', since: scheduledAt });
  });

  it('stops before the first product when an uninstall acquired the lock first', async () => {
    wasUninstalledSince.mockResolvedValue(true);

    const result = await runTask({});

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('stops between products when an uninstall was requested after this install', async () => {
    wasUninstalledSince.mockResolvedValue(true);

    const result = await runTask({ remaining: ['security', 'observability'] });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('propagates status read failures so Task Manager retries instead of completing', async () => {
    wasUninstalledSince.mockRejectedValue(new Error('es unavailable'));

    const error = (await runTask({ remaining: ['security'] }).catch((e) => e)) as Error;

    expect(error.message).toBe('es unavailable');
    expect(isUnrecoverableError(error)).toBe(false);
    expect(installProduct).not.toHaveBeenCalled();
  });

  it('installs each product under the shared install lock', async () => {
    await runTask({ remaining: ['kibana'] });

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.objectContaining({ metadata: expect.objectContaining({ item: 'kibana' }) })
    );
  });

  it('defers the run without installing when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask({ remaining: ['kibana', 'security'], attempts: 2 });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { remaining: ['kibana', 'security'], attempts: 2 },
      runAt: expect.any(Date),
    });
  });

  it('retries a failing product with exponential backoff, keeping the same item', async () => {
    installProduct.mockRejectedValue(new Error('boom'));
    const now = Date.now();

    const first = (await runTask({ remaining: ['kibana', 'security'] })) as {
      state: Record<string, unknown>;
      runAt: Date;
    };
    expect(first.state).toEqual({ remaining: ['kibana', 'security'], attempts: 1 });
    expect(first.runAt.getTime() - now).toBeGreaterThanOrEqual(30_000);
    expect(first.runAt.getTime() - now).toBeLessThan(60_000);

    const third = (await runTask({ ...first.state, attempts: 2 })) as {
      state: Record<string, unknown>;
      runAt: Date;
    };
    expect(third.state).toEqual({ remaining: ['kibana', 'security'], attempts: 3 });
    expect(third.runAt.getTime() - now).toBeGreaterThanOrEqual(120_000);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('fails the task without further retries once the maximum number of retries is exhausted', async () => {
    installProduct.mockRejectedValue(new Error('boom'));

    const error = (await runTask({
      remaining: ['kibana', 'security'],
      attempts: MAX_INSTALL_ITEM_RETRIES,
    }).catch((e) => e)) as Error;

    expect(error.message).toBe('boom');
    expect(isUnrecoverableError(error)).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Giving up'));
  });

  it('resets the attempt counter once the item succeeds', async () => {
    const result = await runTask({ remaining: ['kibana', 'security'], attempts: 2 });

    expect(result).toEqual({ state: { remaining: ['security'] }, runAt: expect.any(Date) });
  });
});
