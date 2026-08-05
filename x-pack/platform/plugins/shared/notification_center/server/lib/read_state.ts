/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import { READ_ALL_BEFORE_KEY, READ_KEY } from '../storage/user_storage';

/**
 * Append a notification id to the caller's individually-read list.
 *
 * Idempotent — re-marking an already-read id is a no-op. `core.userStorage` is
 * last-write-wins with no version token, so two concurrent marks from separate tabs
 * can lose one of the ids; the loss is bounded to a single id and is corrected by the
 * next mark-all-read (which resets the list) and by client re-hydration.
 */
export const markRead = async (client: IUserStorageClient, id: string): Promise<void> => {
  const read = await client.get<string[]>(READ_KEY);
  if (read.includes(id)) {
    return;
  }
  await client.set(READ_KEY, [...read, id]);
};

/**
 * Mark everything read up to now: advance the `readAllBefore` marker to the current
 * instant and clear the per-id list it now subsumes. Returns the new marker.
 *
 * The marker is advanced before the list is cleared so the read window only ever grows
 * if the two writes are observed independently under last-write-wins.
 */
export const markAllRead = async (client: IUserStorageClient): Promise<string> => {
  const readAllBefore = new Date().toISOString();
  await client.set(READ_ALL_BEFORE_KEY, readAllBefore);
  await client.set(READ_KEY, []);
  return readAllBefore;
};
