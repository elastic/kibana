/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryDetail } from '../types/change_history_detail';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';

export const toChangeHistoryPendingListItem = (
  pendingChange: ChangeHistoryPendingChange
): ChangeHistoryListItem => ({
  id: pendingChange.id,
  timestamp: pendingChange.timestamp,
  actor: {
    name: pendingChange.actor.name,
    ...(pendingChange.actor.profileId ? { profileId: pendingChange.actor.profileId } : {}),
  },
  action: pendingChange.action,
  isCurrent: true,
  ...(pendingChange.changes ? { changes: pendingChange.changes } : {}),
});

export const toChangeHistoryPendingDetail = (
  pendingChange: ChangeHistoryPendingChange
): ChangeHistoryDetail => ({
  ...toChangeHistoryPendingListItem(pendingChange),
  snapshot: pendingChange.snapshot,
});

export const prependChangeHistoryPendingChange = (
  items: ChangeHistoryListItem[],
  pendingChange: ChangeHistoryPendingChange
): ChangeHistoryListItem[] => {
  const pendingListItem = toChangeHistoryPendingListItem(pendingChange);
  const committedItems = items.map(({ isCurrent: _isCurrent, ...item }) => item);

  return [pendingListItem, ...committedItems];
};
