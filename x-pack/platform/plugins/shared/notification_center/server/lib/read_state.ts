/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import { READ_ALL_BEFORE_KEY, READ_KEY } from '../storage/user_storage';

/**
 * Append a notification id to the users's individually-read list.

 */
export const markRead = async (client: IUserStorageClient, id: string): Promise<void> => {
  const read = await client.get<string[]>(READ_KEY);
  if (read.includes(id)) {
    return;
  }
  // userStorage doesn't have consistency guarantee, so two concurrent marks from separate tabs
  // can lose one of the ids. This is a risk only for a single id, and will resolve itself
  // by the next mark-all-read or retry by the client.
  await client.set(READ_KEY, [...read, id]);
};

/**
 * Mark everything read up to now for the user.
 */
export const markAllRead = async (client: IUserStorageClient): Promise<string> => {
  const readAllBefore = new Date().toISOString();
  await client.set(READ_ALL_BEFORE_KEY, readAllBefore);
  await client.set(READ_KEY, []);
  return readAllBefore;
};
