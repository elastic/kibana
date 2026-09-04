/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CurrentUser } from '@kbn/agent-builder-common';
import { isConversationOwner } from '../access_control/authorization';
import type { ConversationProperties } from './storage';
import type { ConversationPinnedByEntry } from './types';

/**
 * Projects the per-user `pinned_by` list into the boolean the public API returns.
 * Documents written before this field existed fall back to the legacy `pinned`
 * boolean, which was only ever meaningful for the conversation owner.
 */
export const isPinnedBy = ({
  source,
  user,
}: {
  source: ConversationProperties;
  user: CurrentUser;
}): boolean => {
  if (source.pinned_by !== undefined) {
    return source.pinned_by.some((entry) => entry.userId === user.id);
  }

  return (
    source.pinned === true &&
    isConversationOwner({
      owner: { userId: source.user_id, username: source.user_name },
      user,
    })
  );
};

/**
 * Migrates a legacy `pinned: true` (owner-only) into a `pinned_by` entry, so the first
 * write to an old document carries the prior state forward instead of silently
 * unpinning it.
 */
export const migratePinnedBy = (source: ConversationProperties): ConversationPinnedByEntry[] => {
  if (source.pinned_by !== undefined) {
    return source.pinned_by;
  }

  if (source.pinned === true && source.user_id) {
    return [{ userId: source.user_id }];
  }

  return [];
};

/**
 * Adds or removes `userId` from `pinnedBy`, leaving every other entry untouched, and
 * projects the resulting `pinned` boolean alongside it in the same step. A caller
 * with no stable id (e.g. an API key with no profile) is a silent no-op: both
 * `pinnedBy` and the previously projected `currentPinned` pass through unchanged.
 */
export const updatePinnedBy = ({
  userId,
  pinnedBy = [],
  currentPinned,
  nextPinned,
}: {
  userId?: string;
  pinnedBy?: ConversationPinnedByEntry[];
  currentPinned: boolean;
  nextPinned: boolean;
}): { pinned: boolean; pinned_by: ConversationPinnedByEntry[] } => {
  if (userId === undefined) {
    return { pinned: currentPinned, pinned_by: pinnedBy };
  }

  if (nextPinned) {
    const containsUserId = pinnedBy.some((entry) => entry.userId === userId);

    return { pinned: true, pinned_by: containsUserId ? pinnedBy : [...pinnedBy, { userId }] };
  }

  return { pinned: false, pinned_by: pinnedBy.filter((entry) => entry.userId !== userId) };
};
