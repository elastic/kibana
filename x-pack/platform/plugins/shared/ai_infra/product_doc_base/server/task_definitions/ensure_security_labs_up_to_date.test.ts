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
  registerEnsureSecurityLabsUpToDateTaskDefinition,
  ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE,
} from './ensure_security_labs_up_to_date';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../services/install_lock';

describe('EnsureSecurityLabsUpToDate task', () => {
  let ensureSecurityLabsUpToDate: jest.Mock;
  let withLock: jest.Mock;
  let runTask: () => Promise<unknown>;

  beforeEach(() => {
    ensureSecurityLabsUpToDate = jest.fn().mockResolvedValue(undefined);
    withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());
    const taskManager = taskManagerMock.createSetup();
    registerEnsureSecurityLabsUpToDateTaskDefinition({
      taskManager,
      lockManager: { withLock },
      getServices: () =>
        ({ packageInstaller: { ensureSecurityLabsUpToDate } } as unknown as InternalServices),
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][
        ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE
      ];
    runTask = () =>
      definition
        .createTaskRunner({
          taskInstance: { params: { inferenceId: '.elser', forceUpdate: true }, state: {} },
        } as unknown as RunContext)
        .run();
  });

  it('updates Security Labs under the shared install lock', async () => {
    const result = await runTask();

    expect(withLock).toHaveBeenCalledWith(
      PRODUCT_DOC_INSTALL_LOCK_ID,
      expect.any(Function),
      expect.anything()
    );
    expect(ensureSecurityLabsUpToDate).toHaveBeenCalledWith({
      inferenceId: '.elser',
      forceUpdate: true,
    });
    expect(result).toEqual({ state: {} });
  });

  it('defers the run when another install holds the lock', async () => {
    withLock.mockRejectedValue(new LockAcquisitionError('held'));

    const result = await runTask();

    expect(ensureSecurityLabsUpToDate).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {}, runAt: expect.any(Date) });
  });
});
