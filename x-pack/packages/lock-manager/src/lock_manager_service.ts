/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from '@kbn/core/server';
import { LockId, withLock } from './lock_manager_client';

export class LockManagerService {
  constructor(private readonly coreSetup: CoreSetup<any>, private readonly logger: Logger) {}

  /**
   * Acquires a lock with the given ID and executes the callback function.
   * If the lock is already held by another process, the callback will not be executed.
   *
   * Example usage:
   *
   * const { withLock } = new LockManagerService(coreSetup, logger);
   * await withLock('my_lock', () => {
   *  // perform operation
   * });
   */
  async withLock<T>(
    lockId: LockId,
    callback: () => Promise<T>,
    {
      metadata,
    }: {
      metadata?: Record<string, any>;
    } = {}
  ) {
    const [coreStart] = await this.coreSetup.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const logger = this.logger.get('LockManager');

    return withLock<T>({ esClient, logger, lockId, metadata }, callback);
  }
}
