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
import { registerUninstallAllTaskDefinition, UNINSTALL_ALL_TASK_TYPE } from './uninstall_all';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

describe('UninstallAll task', () => {
  let uninstallAll: jest.Mock;
  let withLock: jest.Mock;
  let runTask: () => Promise<unknown>;

  beforeEach(() => {
    uninstallAll = jest.fn().mockResolvedValue(undefined);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    const taskManager = taskManagerMock.createSetup();
    registerUninstallAllTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () => ({ packageInstaller: { uninstallAll } } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][UNINSTALL_ALL_TASK_TYPE];
    runTask = () =>
      definition
        .createTaskRunner({
          taskInstance: { params: { inferenceId: '.elser' }, state: {} },
        } as unknown as RunContext)
        .run();
  });

  it('uninstalls under the shared install lock', async () => {
    const result = await runTask();

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.anything()
    );
    expect(uninstallAll).toHaveBeenCalledWith({ inferenceId: '.elser' });
    expect(result).toEqual({ state: {} });
  });

  it('defers the run without uninstalling when an install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask();

    expect(uninstallAll).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {}, runAt: expect.any(Date) });
  });
});
