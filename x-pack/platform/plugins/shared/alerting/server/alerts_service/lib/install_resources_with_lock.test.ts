/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { ReplaySubject } from 'rxjs';
import {
  installResourcesWithLock,
  type ResourceInstallLockManager,
} from './install_resources_with_lock';

const logger = loggingSystemMock.createLogger();

const createLockManager = (
  withLock: ResourceInstallLockManager['withLock']
): ResourceInstallLockManager => ({ withLock });

describe('installResourcesWithLock', () => {
  beforeEach(() => jest.clearAllMocks());

  it('runs the install directly when no lock manager is provided', async () => {
    const installFn = jest.fn().mockResolvedValue(undefined);

    await installResourcesWithLock({ lockId: 'lock-a', logger, installFn });

    expect(installFn).toHaveBeenCalledTimes(1);
  });

  it('runs the install inside the lock when acquired', async () => {
    const installFn = jest.fn().mockResolvedValue(undefined);
    const lockManager = createLockManager(jest.fn(async (_lockId, cb) => cb()));

    await installResourcesWithLock({
      lockManager,
      lockId: 'lock-a',
      logger,
      installFn,
    });

    expect(lockManager.withLock).toHaveBeenCalledWith('lock-a', expect.any(Function));
    expect(installFn).toHaveBeenCalledTimes(1);
  });

  it('retries acquisition and succeeds once the lock frees up', async () => {
    const installFn = jest.fn().mockResolvedValue(undefined);
    const withLock = jest
      .fn()
      .mockRejectedValueOnce(new LockAcquisitionError('held'))
      .mockRejectedValueOnce(new LockAcquisitionError('held'))
      .mockImplementationOnce(async (_lockId: string, cb: () => Promise<void>) => cb());

    await installResourcesWithLock({
      lockManager: createLockManager(withLock),
      lockId: 'lock-a',
      logger,
      installFn,
      retryDelayMs: 0,
    });

    expect(withLock).toHaveBeenCalledTimes(3);
    expect(installFn).toHaveBeenCalledTimes(1);
  });

  it('fails without installing outside the lock after maxAttempts', async () => {
    const installFn = jest.fn().mockResolvedValue(undefined);
    const withLock = jest.fn().mockRejectedValue(new LockAcquisitionError('held'));

    await expect(
      installResourcesWithLock({
        lockManager: createLockManager(withLock),
        lockId: 'lock-a',
        logger,
        installFn,
        maxAttempts: 3,
        retryDelayMs: 0,
      })
    ).rejects.toThrow('Could not acquire install lock "lock-a" after 3 attempts');

    expect(withLock).toHaveBeenCalledTimes(3);
    expect(installFn).not.toHaveBeenCalled();
  });

  it('aborts lock retries when the plugin stops', async () => {
    const pluginStop$ = new ReplaySubject<void>(1);
    const installFn = jest.fn().mockResolvedValue(undefined);
    const withLock = jest.fn().mockRejectedValue(new LockAcquisitionError('held'));

    const installation = installResourcesWithLock({
      lockManager: createLockManager(withLock),
      lockId: 'lock-a',
      logger,
      installFn,
      pluginStop$,
      retryDelayMs: 1000,
    });
    pluginStop$.next();

    await expect(installation).rejects.toThrow('Server is stopping');
    expect(installFn).not.toHaveBeenCalled();
  });

  it('does not start installation when the plugin stops during acquisition', async () => {
    const pluginStop$ = new ReplaySubject<void>(1);
    const installFn = jest.fn().mockResolvedValue(undefined);
    const withLock = jest.fn(async (_lockId: string, cb: () => Promise<void>) => {
      pluginStop$.next();
      await cb();
    });

    await expect(
      installResourcesWithLock({
        lockManager: createLockManager(withLock),
        lockId: 'lock-a',
        logger,
        installFn,
        pluginStop$,
      })
    ).rejects.toThrow('Server is stopping');

    expect(installFn).not.toHaveBeenCalled();
  });

  it('propagates install failures (non lock-acquisition errors) without retrying', async () => {
    const installError = new Error('install failed');
    const withLock = jest.fn(async (_lockId: string, cb: () => Promise<void>) => cb());
    const installFn = jest.fn().mockRejectedValue(installError);

    await expect(
      installResourcesWithLock({
        lockManager: createLockManager(withLock),
        lockId: 'lock-a',
        logger,
        installFn,
        retryDelayMs: 0,
      })
    ).rejects.toThrow('install failed');

    expect(withLock).toHaveBeenCalledTimes(1);
    expect(installFn).toHaveBeenCalledTimes(1);
  });
});
