/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import {
  MAX_OVERRIDES,
  OVERRIDES_KEY,
  READ_ALL_BEFORE_KEY,
  type ReadOverrides,
} from '../storage/user_storage';

/** Keep the newest MAX_OVERRIDES entries, dropping the oldest by `markedAt`
 * Ensures the overrides object size stays within limits.
 */
const boundOverrides = (overrides: ReadOverrides): ReadOverrides => {
  const entries = Object.entries(overrides);
  if (entries.length <= MAX_OVERRIDES) {
    return overrides;
  }
  return Object.fromEntries(
    entries
      .sort(([, a], [, b]) => Date.parse(a.markedAt) - Date.parse(b.markedAt))
      .slice(-MAX_OVERRIDES)
  );
};

/**
 * Record a read override for a notification id.
 */
export const markRead = async (client: IUserStorageClient, id: string): Promise<void> => {
  const overrides = await client.get<ReadOverrides>(OVERRIDES_KEY);
  if (overrides[id]?.read === true) {
    return;
  }
  // userStorage doesn't have consistency guarantee, so two concurrent marks from separate tabs
  // can lose one of the ids. This is a risk only for a single id, and will resolve itself
  // by the next mark-all-read or retry by the client.
  const next = { ...overrides, [id]: { read: true, markedAt: new Date().toISOString() } };
  await client.set(OVERRIDES_KEY, boundOverrides(next));
};

/**
 * Mark everything read up to now for the user.
 */
export const markAllRead = async (client: IUserStorageClient): Promise<string> => {
  const readAllBefore = new Date().toISOString();
  await client.set(READ_ALL_BEFORE_KEY, readAllBefore);
  await client.set(OVERRIDES_KEY, {});
  return readAllBefore;
};
