/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CASE_LAST_VIEWED_SAVED_OBJECT } from '../../../common/constants';
import type { LastViewedEntry } from './state';
import { getSeenAt, recordView } from './state';

export interface LastViewedServiceContext {
  readonly log: Logger;
  readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export interface RecordParams {
  readonly userKey: string;
  readonly key: string;
  readonly markSeen?: boolean;
  readonly now?: Date;
}

/**
 * Stores a per-user "last viewed" marker for any entity, addressed by `key` (for example
 * `cases:<caseId>`). A concurrent write from another tab can drop one entry; a missed
 * marker only moves a "what is new" window, so the service does not lock.
 */
export class LastViewedService {
  constructor(private readonly context: LastViewedServiceContext) {}

  private async getEntries(userKey: string): Promise<readonly LastViewedEntry[]> {
    try {
      const { attributes } = await this.context.unsecuredSavedObjectsClient.get<{
        entries: LastViewedEntry[];
      }>(CASE_LAST_VIEWED_SAVED_OBJECT, userKey);
      return attributes.entries;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  }

  public async getSeenAt({
    userKey,
    key,
  }: Pick<RecordParams, 'userKey' | 'key'>): Promise<string | null> {
    return getSeenAt(await this.getEntries(userKey), key);
  }

  public async record({
    userKey,
    key,
    markSeen = false,
    now = new Date(),
  }: RecordParams): Promise<string | null> {
    const current = await this.getEntries(userKey);
    const { entries, changed } = recordView({ entries: current, key, now, markSeen });

    if (changed) {
      await this.context.unsecuredSavedObjectsClient.create(
        CASE_LAST_VIEWED_SAVED_OBJECT,
        { entries },
        { id: userKey, overwrite: true }
      );
    }

    return getSeenAt(entries, key);
  }
}
