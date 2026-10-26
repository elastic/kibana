/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateChangeHistoryDocument } from '@kbn/change-history/test_utils';
import type { ChangeHistoryDocument } from '@kbn/change-history';
import { toDetail, toListItem } from './map_rule_change';

const docWith = (
  sequence: number,
  snapshot: Record<string, unknown>,
  overrides: Partial<ChangeHistoryDocument['object']> = {}
): ChangeHistoryDocument => {
  const base = generateChangeHistoryDocument();
  return {
    ...base,
    object: { ...base.object, id: 'rule-1', sequence, snapshot, ...overrides },
  };
};

describe('toListItem', () => {
  it('reports the sequence as the row version', () => {
    const item = toListItem(docWith(4, { id: 'rule-1', version: 4 }), undefined, {
      isCurrent: true,
    });

    expect(item.version).toBe(4);
  });

  // The snapshot is the whole rule, so the counter is part of the diff like any
  // other field. It advances on every write, so it appears in every summary.
  it('diffs the version counter alongside the real change', () => {
    const previous = docWith(1, { id: 'rule-1', version: 1, metadata: { name: 'original' } });
    const current = docWith(2, { id: 'rule-1', version: 2, metadata: { name: 'renamed' } });

    const item = toListItem(current, previous, { isCurrent: true });

    expect(item.changes).toEqual({
      count: 2,
      summary: { version: 1, metadata: { name: 'original' } },
    });
  });

  it('reports the counter alone when nothing else changed', () => {
    const previous = docWith(1, { id: 'rule-1', version: 1, metadata: { name: 'same' } });
    const current = docWith(2, { id: 'rule-1', version: 2, metadata: { name: 'same' } });

    const item = toListItem(current, previous, { isCurrent: true });

    expect(item.changes).toEqual({ count: 1, summary: { version: 1 } });
  });

  describe('actor', () => {
    const docWithUser = (user: ChangeHistoryDocument['user']): ChangeHistoryDocument => ({
      ...docWith(1, { id: 'rule-1', version: 1 }),
      user,
    });

    it('uses the profile full name when available', () => {
      const item = toListItem(
        docWithUser({
          id: 'profile-1',
          name: 'jdoe',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
        }),
        undefined,
        { isCurrent: true }
      );

      expect(item.actor).toEqual({ name: 'Jane Doe', profile_id: 'profile-1' });
    });

    it('falls back to the profile email when there is no full name', () => {
      const item = toListItem(
        docWithUser({ id: 'profile-1', name: 'jdoe', full_name: '', email: 'jane@example.com' }),
        undefined,
        { isCurrent: true }
      );

      expect(item.actor).toEqual({ name: 'jane@example.com', profile_id: 'profile-1' });
    });

    it('falls back to the stored user name when the profile was not resolved', () => {
      const item = toListItem(docWithUser({ name: 'jdoe' }), undefined, { isCurrent: true });

      expect(item.actor).toEqual({ name: 'jdoe' });
    });
  });
});

describe('toDetail', () => {
  it('returns the stored snapshot intact, version included', () => {
    const snapshot = { id: 'rule-1', version: 4, metadata: { name: 'a-rule' } };

    const detail = toDetail(docWith(4, snapshot), undefined, { isCurrent: true });

    expect(detail.snapshot).toEqual(snapshot);
  });
});
