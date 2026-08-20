/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LockAcquisitionError } from '@kbn/lock-manager';
import pRetry from 'p-retry';

import { FleetErrorWithStatusCode } from '../../../../errors';
import { appContextService } from '../../../app_context';

export const DATASET_OWNERSHIP_LOCK_ID = 'fleet-dataset-ownership';

/**
 * Serializes claim mutations. Missing lock manager fails closed: proceeding unlocked would
 * reopen the install/adoption race this lock exists to close.
 */
export const withDatasetOwnershipLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const lockManager = appContextService.getLockManagerService();
  if (!lockManager) {
    throw new FleetErrorWithStatusCode('Dataset ownership lock is unavailable', 503);
  }

  let callbackStarted = false;
  return pRetry(
    () =>
      lockManager.withLock(DATASET_OWNERSHIP_LOCK_ID, async () => {
        callbackStarted = true;
        return fn();
      }),
    {
      onFailedAttempt: async (error) => {
        if (callbackStarted || !(error instanceof LockAcquisitionError)) {
          throw error;
        }
      },
      minTimeout: 50,
      maxRetryTime: 30 * 1000,
    }
  );
};
