/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import {
  MAX_OVERRIDES,
  OVERRIDES_KEY,
  READ_ALL_BEFORE_KEY,
  type ReadOverrides,
} from '../storage/user_storage';

/**
 * Per-user read state used to annotate the notification list.
 * `readAllBefore` is the bulk catch-up marker; `overrides` holds the per-id exceptions taken
 * since it, each stamped with the instant it was recorded. `markAllRead` advances the marker
 * and clears the overrides, since a marker at `now` already subsumes every entry.
 */
export interface NotificationReadState {
  overrides: ReadOverrides;
  readAllBefore: string;
}

/**
 * Fetch the user's read state for annotating the notification list.
 * A userStorage failure degrades to `undefined` (an unannotated list) instead of
 * failing the whole read path.
 */
export const getReadState = async (
  client: IUserStorageClient,
  logger: Logger
): Promise<NotificationReadState | undefined> => {
  try {
    const [overrides, readAllBefore] = await Promise.all([
      client.get<ReadOverrides>(OVERRIDES_KEY),
      client.get<string>(READ_ALL_BEFORE_KEY),
    ]);
    return { overrides, readAllBefore };
  } catch (error) {
    logger.warn(`Failed to fetch read state; returning an unannotated list. ${error}`);
    return undefined;
  }
};

/**
 * Resolve whether a notification is read, judged on the timestamp of the copy representing it.
 * A per-id override wins over the bulk marker, and both are time-based: a copy pushed after
 * whichever applies is new activity and reads as unread. A `read: false` override — the half
 * of the stored shape no route writes yet — pins the id unread regardless of the copy.
 */
export const isReadAt = (
  { overrides, readAllBefore }: NotificationReadState,
  id: string,
  copyTimestamp: string
): boolean => {
  const override = overrides[id];
  const copyMs = Date.parse(copyTimestamp);
  if (override) {
    return override.read && copyMs <= Date.parse(override.markedAt);
  }
  return copyMs <= Date.parse(readAllBefore);
};

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
