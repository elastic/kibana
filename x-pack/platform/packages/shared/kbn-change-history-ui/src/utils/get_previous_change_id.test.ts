/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import { getPreviousChangeId } from './get_previous_change_id';

const listItems: ChangeHistoryListItem[] = [
  {
    id: 'v4',
    timestamp: '2026-06-23T12:00:00.000Z',
    actor: { name: 'elastic' },
    action: 'update',
  },
  {
    id: 'v3',
    timestamp: '2026-06-22T12:00:00.000Z',
    actor: { name: 'elastic' },
    action: 'update',
  },
  {
    id: 'v2',
    timestamp: '2026-06-21T12:00:00.000Z',
    actor: { name: 'elastic' },
    action: 'update',
  },
];

describe('getPreviousChangeId', () => {
  it('returns the next list item when history is newest-first', () => {
    expect(getPreviousChangeId(listItems, 'v4')).toBe('v3');
    expect(getPreviousChangeId(listItems, 'v3')).toBe('v2');
  });

  it('returns undefined for the oldest loaded item or unknown selection', () => {
    expect(getPreviousChangeId(listItems, 'v2')).toBeUndefined();
    expect(getPreviousChangeId(listItems, 'missing')).toBeUndefined();
    expect(getPreviousChangeId(listItems, undefined)).toBeUndefined();
  });
});
