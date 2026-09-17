/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { DocumentationProduct } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import { registerInstallAllTaskDefinition, INSTALL_ALL_TASK_TYPE } from './install_all';

const allProducts = Object.values(DocumentationProduct);

describe('InstallAll task', () => {
  let installProduct: jest.Mock;
  let runTask: (state: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    installProduct = jest.fn().mockResolvedValue(undefined);
    const taskManager = taskManagerMock.createSetup();
    registerInstallAllTaskDefinition({
      taskManager,
      getServices: () => ({ packageInstaller: { installProduct } } as unknown as InternalServices),
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
});
