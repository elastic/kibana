/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';
import { TEST_SNAPSHOT } from '../test_utils/change_history_test_fixtures';
import { getChangeHistoryPendingChangeFingerprint } from './get_change_history_pending_change_fingerprint';

describe('getChangeHistoryPendingChangeFingerprint', () => {
  it('returns an empty string when pending change is undefined', () => {
    expect(getChangeHistoryPendingChangeFingerprint(undefined)).toBe('');
  });

  it('changes when snapshot or changes count changes', () => {
    const base: ChangeHistoryPendingChange = {
      id: '__pending__',
      timestamp: '2026-07-03T12:00:00.000Z',
      actor: { name: 'You' },
      action: 'Unsaved changes',
      snapshot: TEST_SNAPSHOT,
      changes: { count: 1 },
    };

    const first = getChangeHistoryPendingChangeFingerprint(base);
    const second = getChangeHistoryPendingChangeFingerprint({
      ...base,
      snapshot: { content: 'name: edited\n' },
    });
    const third = getChangeHistoryPendingChangeFingerprint({
      ...base,
      changes: { count: 2 },
    });

    expect(first).not.toBe(second);
    expect(first).not.toBe(third);
  });

  it('uses a compact snapshot fingerprint instead of embedding serialized snapshot text', () => {
    const largeSnapshot = { content: 'a'.repeat(500) };
    const fingerprint = getChangeHistoryPendingChangeFingerprint({
      id: '__pending__',
      timestamp: '2026-07-03T12:00:00.000Z',
      actor: { name: 'You' },
      action: 'Unsaved changes',
      snapshot: largeSnapshot,
    });

    expect(fingerprint).not.toContain('aaaa');
    expect(fingerprint.split('|')).toHaveLength(4);
  });
});
