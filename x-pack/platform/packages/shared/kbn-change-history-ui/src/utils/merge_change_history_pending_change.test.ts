/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';
import { TEST_SNAPSHOT } from '../test_utils/change_history_test_fixtures';
import {
  prependChangeHistoryPendingChange,
  toChangeHistoryPendingDetail,
  toChangeHistoryPendingListItem,
} from './merge_change_history_pending_change';

describe('prependChangeHistoryPendingChange', () => {
  const pendingChange: ChangeHistoryPendingChange = {
    id: '__pending__',
    timestamp: '2026-07-03T12:00:00.000Z',
    actor: { name: 'You' },
    action: 'Unsaved changes',
    snapshot: TEST_SNAPSHOT,
    changes: { count: 2 },
  };

  const committedItems: ChangeHistoryListItem[] = [
    {
      id: 'evt-current',
      timestamp: '2026-06-16T12:00:00.000Z',
      actor: { name: 'Alice' },
      action: 'Updated',
      isCurrent: true,
      metadata: { version: 3 },
    },
    {
      id: 'evt-previous',
      timestamp: '2026-06-15T12:00:00.000Z',
      actor: { name: 'Bob' },
      action: 'Created',
      metadata: { version: 1 },
    },
  ];

  it('prepends the pending row as current without a sequence', () => {
    const merged = prependChangeHistoryPendingChange(committedItems, pendingChange);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toEqual(toChangeHistoryPendingListItem(pendingChange));
    expect(merged[0].metadata).toBeUndefined();
  });

  it('clears isCurrent from committed rows', () => {
    const merged = prependChangeHistoryPendingChange(committedItems, pendingChange);

    expect(merged[1]?.isCurrent).toBeUndefined();
  });
});

describe('toChangeHistoryPendingDetail', () => {
  it('includes snapshot for preview', () => {
    const detail = toChangeHistoryPendingDetail({
      id: '__pending__',
      timestamp: '2026-07-03T12:00:00.000Z',
      actor: { name: 'You' },
      action: 'Unsaved changes',
      snapshot: TEST_SNAPSHOT,
    });

    expect(detail.snapshot).toEqual(TEST_SNAPSHOT);
    expect(detail.isCurrent).toBe(true);
  });
});
