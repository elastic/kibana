/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import { MAX_READ_IDS, READ_ALL_BEFORE_KEY, READ_KEY } from '../storage/user_storage';

/**
 * Per-user read state used to annotate the notification list.
 * The two fields back two deliberately different gestures:
 * - `read` is identity-based and durable: an id in it stays read across re-pushes (a mute).
 * - `readAllBefore` is time-based: only copies at or before the marker are read, so a
 *   re-push after it resurfaces as unread.
 */
export interface NotificationReadState {
  read: string[];
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
    const [read, readAllBefore] = await Promise.all([
      client.get<string[]>(READ_KEY),
      client.get<string>(READ_ALL_BEFORE_KEY),
    ]);
    return { read, readAllBefore };
  } catch (error) {
    logger.warn(`Failed to fetch read state; returning an unannotated list. ${error}`);
    return undefined;
  }
};

/**
 * Append a notification id to the user's individually-read list.
 */
export const markRead = async (client: IUserStorageClient, id: string): Promise<void> => {
  const read = await client.get<string[]>(READ_KEY);
  if (read.includes(id)) {
    return;
  }
  // userStorage doesn't have consistency guarantee, so two concurrent marks from separate tabs
  // can lose one of the ids. This is a risk only for a single id, and will resolve itself
  // by a retry from the client.
  // Cap at the newest MAX_READ_IDS (the schema's ceiling), silently dropping the oldest ids so
  // the write stays valid.
  await client.set(READ_KEY, [...read, id].slice(-MAX_READ_IDS));
};

/**
 * Mark everything read up to now for the user. The `read` list is left untouched:
 * its ids are durable acknowledgements that must survive a bulk catch-up, otherwise
 * marking all read would silently un-mute previously acknowledged notifications.
 */
export const markAllRead = async (client: IUserStorageClient): Promise<string> => {
  const readAllBefore = new Date().toISOString();
  await client.set(READ_ALL_BEFORE_KEY, readAllBefore);
  return readAllBefore;
};
