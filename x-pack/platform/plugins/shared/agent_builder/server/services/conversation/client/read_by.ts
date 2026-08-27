/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CurrentUser } from '@kbn/agent-builder-common';
import { isConversationOwner } from '../access_control/authorization';
import type { ConversationProperties } from './storage';
import type { ConversationReadByEntry } from './types';

/**
 * Projects the per-user `read_by` list into the boolean the public API returns.
 * Documents written before this field existed fall back to the legacy `read`
 * boolean, which was only ever meaningful for the conversation owner.
 */
export const isReadBy = ({
  source,
  user,
}: {
  source: ConversationProperties;
  user: CurrentUser;
}): boolean => {
  if (source.read_by !== undefined) {
    return source.read_by.some((entry) => entry.userId === user.id);
  }

  return (
    source.read === true &&
    isConversationOwner({
      owner: { userId: source.user_id, username: source.user_name },
      user,
    })
  );
};

/**
 * Migrates a legacy `read: true` (owner-only) into a `read_by` entry, so the first
 * write to an old document carries the prior state forward instead of silently
 * resetting it to unread.
 */
export const migrateReadBy = (source: ConversationProperties): ConversationReadByEntry[] => {
  if (source.read_by !== undefined) {
    return source.read_by;
  }

  if (source.read === true && source.user_id) {
    return [{ userId: source.user_id }];
  }

  return [];
};

/**
 * Adds or removes `userId` from `readBy`, leaving every other entry untouched, and
 * projects the resulting `read` boolean alongside it in the same step. A caller
 * with no stable id (e.g. an API key with no profile) is a silent no-op: both
 * `readBy` and the previously projected `currentRead` pass through unchanged.
 */
export const updateReadBy = ({
  userId,
  readBy = [],
  currentRead,
  nextRead,
}: {
  userId?: string;
  readBy?: ConversationReadByEntry[];
  currentRead: boolean;
  nextRead: boolean;
}): { read: boolean; read_by: ConversationReadByEntry[] } => {
  if (userId === undefined) {
    return { read: currentRead, read_by: readBy };
  }

  if (nextRead) {
    const containsUserId = readBy.some((entry) => entry.userId === userId);

    return { read: true, read_by: containsUserId ? readBy : [...readBy, { userId }] };
  }

  return { read: false, read_by: readBy.filter((entry) => entry.userId !== userId) };
};
