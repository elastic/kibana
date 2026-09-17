/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import type { InternalServices } from '../types';
import {
  registerEnsureUpToDateTaskDefinition,
  ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
} from './ensure_up_to_date';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from './utils';

describe('EnsureUpToDate task', () => {
  let installProduct: jest.Mock;
  let getProductsToUpdate: jest.Mock;
  let ensureOpenApiSpecUpToDate: jest.Mock;
  let withLock: jest.Mock;
  let runTask: (state: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    installProduct = jest.fn().mockResolvedValue(undefined);
    getProductsToUpdate = jest.fn().mockResolvedValue(['kibana', 'security']);
    ensureOpenApiSpecUpToDate = jest.fn().mockResolvedValue(undefined);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    const taskManager = taskManagerMock.createSetup();
    registerEnsureUpToDateTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({
          packageInstaller: { installProduct, getProductsToUpdate, ensureOpenApiSpecUpToDate },
        } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][ENSURE_DOC_UP_TO_DATE_TASK_TYPE];
    runTask = (state) =>
      definition
        .createTaskRunner({
          taskInstance: { params: { inferenceId: '.elser', forceUpdate: true }, state },
        } as unknown as RunContext)
        .run();
  });

  it('computes the update plan on the first run and handles the first item', async () => {
    const result = await runTask({});

    expect(getProductsToUpdate).toHaveBeenCalledWith({ inferenceId: '.elser', forceUpdate: true });
    expect(installProduct).toHaveBeenCalledWith({ productName: 'kibana', inferenceId: '.elser' });
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { remaining: ['security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });

  it('does not recompute the plan when remaining items are persisted', async () => {
    await runTask({ remaining: ['security', 'openapi'] });

    expect(getProductsToUpdate).not.toHaveBeenCalled();
    expect(installProduct).toHaveBeenCalledWith({ productName: 'security', inferenceId: '.elser' });
  });

  it('updates the OpenAPI spec as the last item and completes', async () => {
    const result = await runTask({ remaining: ['openapi'] });

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

    expect(installProduct).not.toHaveBeenCalled();
    expect(ensureOpenApiSpecUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: { remaining: ['kibana', 'security', 'openapi'] },
      runAt: expect.any(Date),
    });
  });
});
