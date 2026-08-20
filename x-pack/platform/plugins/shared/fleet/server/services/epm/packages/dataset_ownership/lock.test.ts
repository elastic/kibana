/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LockAcquisitionError } from '@kbn/lock-manager';

import { appContextService } from '../../../app_context';

import { DATASET_OWNERSHIP_LOCK_ID, withDatasetOwnershipLock } from './lock';

jest.mock('../../../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('withDatasetOwnershipLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the lock manager is unavailable', async () => {
    mockedAppContextService.getLockManagerService.mockReturnValue(undefined as never);

    await expect(withDatasetOwnershipLock(async () => 'ok')).rejects.toThrow(
      /Dataset ownership lock is unavailable/
    );
  });

  it('runs the callback under the dataset ownership lock', async () => {
    const withLock = jest.fn(async (_id: string, fn: () => Promise<unknown>) => fn());
    mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);

    await expect(withDatasetOwnershipLock(async () => 'ok')).resolves.toBe('ok');
    expect(withLock).toHaveBeenCalledWith(DATASET_OWNERSHIP_LOCK_ID, expect.any(Function));
  });

  it('retries when the lock cannot be acquired', async () => {
    const withLock = jest
      .fn()
      .mockRejectedValueOnce(new LockAcquisitionError('busy'))
      .mockImplementationOnce(async (_id: string, fn: () => Promise<unknown>) => fn());
    mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);

    await expect(withDatasetOwnershipLock(async () => 'ok')).resolves.toBe('ok');
    expect(withLock).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the callback itself fails', async () => {
    const withLock = jest.fn(async (_id: string, fn: () => Promise<unknown>) => fn());
    mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);

    await expect(
      withDatasetOwnershipLock(async () => {
        throw new Error('claim conflict');
      })
    ).rejects.toThrow(/claim conflict/);
    expect(withLock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a LockAcquisitionError after the callback has started', async () => {
    const withLock = jest.fn(async (_id: string, fn: () => Promise<unknown>) => fn());
    mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);

    await expect(
      withDatasetOwnershipLock(async () => {
        throw new LockAcquisitionError('lost during work');
      })
    ).rejects.toBeInstanceOf(LockAcquisitionError);
    expect(withLock).toHaveBeenCalledTimes(1);
  });
});
