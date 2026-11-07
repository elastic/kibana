/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { Logger } from '@kbn/core-di';
import type { Logger as ILogger } from '@kbn/core/server';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import { ScopedUserStorage } from '../tokens';
import { UserProfileRequiredError } from './user_profile_required_error';
import {
  MAX_OVERRIDES,
  OVERRIDES_KEY,
  READ_ALL_BEFORE_DEFAULT,
  READ_ALL_BEFORE_KEY,
  type ReadOverrides,
} from '../storage/user_storage';

/**
 * Per-user read state used to annotate the notification list.
 * `readAllBefore` is the timestamped catch-up marker: "mark all as read"
 * `overrides` holds the individual IDs marked as read since the catch-up marker.
 * `markAllRead` advances the marker and clears the overrides, since a marker at `now` already
 * subsumes every entry.
 */
export interface NotificationReadState {
  overrides: ReadOverrides;
  readAllBefore: string;
}

/**
 * Determine whether a notification is read
 * 1. Check if the notification is marked as read in the overrides object
 * 2. If not, check if the notification is earlier than the readAllBefore timestamp
 * 3. If both are false, the notification is unread
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

/** The caller's notification read state, backed by their own profile-scoped user storage. */
@injectable()
export class ReadStateService {
  constructor(
    @inject(ScopedUserStorage) private readonly client: IUserStorageClient | null,
    @inject(Logger) private readonly logger: ILogger
  ) {}

  /** False for callers without a user profile (API keys), which have no read state to read or write. */
  public get hasUserProfile(): boolean {
    return this.client !== null;
  }

  /**
   * Fetch the user's read state for annotating the notification list.
   * Stamp the catch-up marker on a first read.
   * A missing user profile or a userStorage failure results in `undefined` (an unannotated list).
   */
  public async get(): Promise<NotificationReadState | undefined> {
    if (!this.client) {
      return undefined;
    }
    try {
      const [overrides, stored] = await Promise.all([
        this.client.get<ReadOverrides>(OVERRIDES_KEY),
        this.client.get<string>(READ_ALL_BEFORE_KEY),
      ]);
      const readAllBefore =
        typeof stored !== 'string' || !stored || stored === READ_ALL_BEFORE_DEFAULT
          ? await this.initializeReadHorizon()
          : stored;
      return { overrides, readAllBefore };
    } catch (error) {
      this.logger.debug('Failed to fetch read state.', { error });
      return undefined;
    }
  }

  /**
   * Mark an individual notification as read, adding it to the overrides for a user.
   * Update `markedAt` if that notification ID was already marked as read.
   */
  public async markRead(id: string): Promise<void> {
    const client = this.requireClient();
    const overrides = await client.get<ReadOverrides>(OVERRIDES_KEY);
    // userStorage doesn't have consistency guarantee, so two concurrent marks from separate tabs
    // can lose one of the ids. This is a risk only for a single id, and will resolve itself
    // by the next mark-all-read or retry by the client.
    const next = { ...overrides, [id]: { read: true, markedAt: new Date().toISOString() } };
    await client.set(OVERRIDES_KEY, boundOverrides(next));
  }

  /** Mark everything read up to now for the user. */
  public async markAllRead(): Promise<string> {
    const client = this.requireClient();
    const readAllBefore = new Date().toISOString();
    await client.set(READ_ALL_BEFORE_KEY, readAllBefore);
    await client.set(OVERRIDES_KEY, {});
    return readAllBefore;
  }

  /**
   * Stamp the catch-up marker at the moment a user first reads their notifications, so the
   * backlog they inherit doesn't show up as unread.
   */
  private async initializeReadHorizon(): Promise<string> {
    const client = this.requireClient();
    const readAllBefore = new Date().toISOString();
    await client.set(READ_ALL_BEFORE_KEY, readAllBefore);
    return readAllBefore;
  }

  private requireClient(): IUserStorageClient {
    if (!this.client) {
      throw new UserProfileRequiredError();
    }
    return this.client;
  }
}
