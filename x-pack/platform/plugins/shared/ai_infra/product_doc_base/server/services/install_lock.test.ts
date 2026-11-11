/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LockAcquisitionError } from '@kbn/lock-manager';
import {
  PRODUCT_DOC_INSTALL_LOCK_ID,
  tryWithInstallLock,
  waitForInstallLock,
} from './install_lock';

describe('install lock', () => {
  let withLock: jest.Mock;

  beforeEach(() => {
    withLock = jest.fn((_lockId: string, callback: () => Promise<unknown>) => callback());
  });

  describe('tryWithInstallLock', () => {
    it('runs the callback under the install lock and resolves true', async () => {
      const run = jest.fn().mockResolvedValue(undefined);

      await expect(
        tryWithInstallLock({ lockManager: { withLock }, run, metadata: { item: 'kibana' } })
      ).resolves.toBe(true);

      expect(withLock).toHaveBeenCalledWith(PRODUCT_DOC_INSTALL_LOCK_ID, run, {
        metadata: { item: 'kibana' },
      });
      expect(run).toHaveBeenCalledTimes(1);
    });

    it('resolves false when the lock is held', async () => {
      withLock.mockRejectedValue(new LockAcquisitionError('held'));

      await expect(tryWithInstallLock({ lockManager: { withLock }, run: jest.fn() })).resolves.toBe(
        false
      );
    });

    it('rethrows errors from the callback', async () => {
      await expect(
        tryWithInstallLock({
          lockManager: { withLock },
          run: () => Promise.reject(new Error('boom')),
        })
      ).rejects.toThrow('boom');
    });
  });

  describe('waitForInstallLock', () => {
    it('retries until the lock is acquired and returns the callback result', async () => {
      withLock
        .mockRejectedValueOnce(new LockAcquisitionError('held'))
        .mockRejectedValueOnce(new LockAcquisitionError('held'))
        .mockImplementationOnce((_lockId: string, callback: () => Promise<unknown>) => callback());

      await expect(
        waitForInstallLock({
          lockManager: { withLock },
          run: async () => 'done',
          retryDelayMs: 0,
        })
      ).resolves.toBe('done');
      expect(withLock).toHaveBeenCalledTimes(3);
    });

    it('fails once the timeout elapses while the lock stays held', async () => {
      withLock.mockRejectedValue(new LockAcquisitionError('held'));

      await expect(
        waitForInstallLock({
          lockManager: { withLock },
          run: async () => 'done',
          retryDelayMs: 1,
          timeoutMs: 5,
        })
      ).rejects.toThrow('Timed out waiting for the product documentation install lock');
    });

    it('does not retry errors from the callback', async () => {
      await expect(
        waitForInstallLock({
          lockManager: { withLock },
          run: () => Promise.reject(new Error('boom')),
          retryDelayMs: 0,
        })
      ).rejects.toThrow('boom');
      expect(withLock).toHaveBeenCalledTimes(1);
    });
  });
});
