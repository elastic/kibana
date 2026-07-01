/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import { resolveChangeHistoryCompareEndpoints } from './resolve_change_history_compare_endpoints';

const items: ChangeHistoryListItem[] = [
  {
    id: 'evt-7',
    timestamp: '2026-06-16T12:00:00.000Z',
    actor: { name: 'Alice' },
    action: 'Updated',
    isCurrent: true,
  },
  {
    id: 'evt-3',
    timestamp: '2026-06-15T12:00:00.000Z',
    actor: { name: 'Alice' },
    action: 'Updated',
  },
  {
    id: 'evt-1',
    timestamp: '2026-06-14T12:00:00.000Z',
    actor: { name: 'Bob' },
    action: 'Created',
  },
];

describe('resolveChangeHistoryCompareEndpoints', () => {
  it('uses vs_previous when the current row is selected', () => {
    expect(resolveChangeHistoryCompareEndpoints(items, 'evt-7')).toEqual({
      comparisonType: 'vs_previous',
      baselineChangeId: 'evt-3',
      targetChangeId: 'evt-7',
    });
  });

  it('uses vs_previous when a non-current row is selected', () => {
    expect(resolveChangeHistoryCompareEndpoints(items, 'evt-3')).toEqual({
      comparisonType: 'vs_previous',
      baselineChangeId: 'evt-1',
      targetChangeId: 'evt-3',
    });
  });

  it('returns undefined for the oldest row without a previous version', () => {
    expect(resolveChangeHistoryCompareEndpoints(items, 'evt-1')).toBeUndefined();
  });

  it('uses vs_row to compare the preview selection with the row action target', () => {
    expect(
      resolveChangeHistoryCompareEndpoints(items, 'evt-7', {
        type: 'vs_row',
        rowChangeId: 'evt-3',
      })
    ).toEqual({
      comparisonType: 'vs_row',
      baselineChangeId: 'evt-3',
      targetChangeId: 'evt-7',
    });
  });

  it('orders vs_row endpoints chronologically when the row is newer than the selection', () => {
    expect(
      resolveChangeHistoryCompareEndpoints(items, 'evt-3', {
        type: 'vs_row',
        rowChangeId: 'evt-7',
      })
    ).toEqual({
      comparisonType: 'vs_row',
      baselineChangeId: 'evt-3',
      targetChangeId: 'evt-7',
    });
  });

  it('returns undefined when vs_row targets the same version', () => {
    expect(
      resolveChangeHistoryCompareEndpoints(items, 'evt-3', {
        type: 'vs_row',
        rowChangeId: 'evt-3',
      })
    ).toBeUndefined();
  });
});
