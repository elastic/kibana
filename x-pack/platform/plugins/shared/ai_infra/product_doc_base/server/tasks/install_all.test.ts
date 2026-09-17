/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { DocumentationProduct } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import { registerInstallAllTaskDefinition, INSTALL_ALL_TASK_TYPE } from './install_all';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

const allProducts = Object.values(DocumentationProduct);

describe('InstallAll task', () => {
  let installProduct: jest.Mock;
  let hasUninstalledProducts: jest.Mock;
  let withLock: jest.Mock;
  let runTask: (state: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    installProduct = jest.fn().mockResolvedValue(true);
    hasUninstalledProducts = jest.fn().mockResolvedValue(false);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    const taskManager = taskManagerMock.createSetup();
    registerInstallAllTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({
          packageInstaller: { installProduct, hasUninstalledProducts },
        } as unknown as InternalServices),
    });
    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][INSTALL_ALL_TASK_TYPE];
    runTask = (state) =>
      definition
        .createTaskRunner({
          taskInstance: { params: { inferenceId: '.elser' }, state },
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
      state: { remaining: allProducts.slice(1), installed: [allProducts[0]] },
      runAt: expect.any(Date),
    });
  });

  it('continues from the persisted remaining products', async () => {
    const result = await runTask({
      remaining: ['security', 'observability'],
      installed: ['kibana'],
    });

    expect(hasUninstalledProducts).toHaveBeenCalledWith({
      productNames: ['kibana'],
      inferenceId: '.elser',
    });
    expect(installProduct).toHaveBeenCalledWith({ productName: 'security', inferenceId: '.elser' });
    expect(result).toEqual({
      state: { remaining: ['observability'], installed: ['kibana', 'security'] },
      runAt: expect.any(Date),
    });
  });

  it('does not track a product the installer skipped, so later products still install', async () => {
    installProduct.mockResolvedValueOnce(false);

    const first = await runTask({ remaining: ['kibana', 'security'] });
    expect(first).toEqual({
      state: { remaining: ['security'], installed: [] },
      runAt: expect.any(Date),
    });

    const second = await runTask({ remaining: ['security'], installed: [] });
    expect(hasUninstalledProducts).not.toHaveBeenCalled();
    expect(installProduct).toHaveBeenLastCalledWith({
      productName: 'security',
      inferenceId: '.elser',
    });
    expect(second).toEqual({ state: {} });
  });

  it('propagates status read failures so Task Manager retries instead of completing', async () => {
    hasUninstalledProducts.mockRejectedValue(new Error('es unavailable'));

    await expect(
      runTask({ remaining: ['security', 'observability'], installed: ['kibana'] })
    ).rejects.toThrow('es unavailable');
    expect(installProduct).not.toHaveBeenCalled();
  });

  it('stops without installing when a product installed earlier in this run was uninstalled', async () => {
    hasUninstalledProducts.mockResolvedValue(true);

    const result = await runTask({
      remaining: ['security', 'observability'],
      installed: ['kibana'],
    });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('completes without rescheduling after the last product', async () => {
    const result = await runTask({ remaining: ['observability'] });

    expect(installProduct).toHaveBeenCalledWith({
      productName: 'observability',
      inferenceId: '.elser',
    });
    expect(result).toEqual({ state: {} });
  });

  it('ignores unknown product names in the persisted state', async () => {
    const result = await runTask({ remaining: ['not-a-product'] });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('propagates installation errors so Task Manager retries the same product', async () => {
    installProduct.mockRejectedValue(new Error('boom'));

    await expect(runTask({ remaining: ['kibana', 'security'] })).rejects.toThrow('boom');
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
    const before = Date.now();

    const result = await runTask({ remaining: ['kibana', 'security'] });

    expect(installProduct).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { remaining: ['kibana', 'security'], installed: [] },
      runAt: expect.any(Date),
    });
    expect((result as { runAt: Date }).runAt.getTime()).toBeGreaterThan(before);
  });
});
