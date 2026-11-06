/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import { findCommittedChangeHistoryListItem } from './find_committed_change_history_list_item';

describe('findCommittedChangeHistoryListItem', () => {
  it('returns the first row with version metadata', () => {
    const items: ChangeHistoryListItem[] = [
      {
        id: '__pending__',
        timestamp: '2026-07-03T12:00:00.000Z',
        actor: { name: 'You' },
        action: 'Unsaved changes',
        isCurrent: true,
      },
      {
        id: 'evt-current',
        timestamp: '2026-06-16T12:00:00.000Z',
        actor: { name: 'Alice' },
        action: 'Updated',
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

    expect(findCommittedChangeHistoryListItem(items)?.id).toBe('evt-current');
  });

  it('returns undefined when no row has version metadata', () => {
    const items: ChangeHistoryListItem[] = [
      {
        id: '__pending__',
        timestamp: '2026-07-03T12:00:00.000Z',
        actor: { name: 'You' },
        action: 'Unsaved changes',
        isCurrent: true,
      },
    ];

    expect(findCommittedChangeHistoryListItem(items)).toBeUndefined();
  });
});
