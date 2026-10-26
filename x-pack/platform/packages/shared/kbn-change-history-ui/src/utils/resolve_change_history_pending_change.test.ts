/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';
import { TEST_SNAPSHOT } from '../test_utils/change_history_test_fixtures';
import { resolveChangeHistoryPendingChange } from './resolve_change_history_pending_change';

const pendingChange: ChangeHistoryPendingChange = {
  id: '__pending__',
  timestamp: '2026-07-03T12:00:00.000Z',
  actor: { name: 'You' },
  action: 'Unsaved changes',
  snapshot: TEST_SNAPSHOT,
};

const adapterWithPendingChange: ChangeHistoryAdapter = {
  listChanges: jest.fn(),
  getChange: jest.fn(),
  getPendingChange: () => pendingChange,
};

describe('resolveChangeHistoryPendingChange', () => {
  it('returns pending change when the feature is enabled', () => {
    expect(resolveChangeHistoryPendingChange(adapterWithPendingChange, true)).toBe(pendingChange);
  });

  it('returns undefined when the feature is disabled', () => {
    expect(resolveChangeHistoryPendingChange(adapterWithPendingChange, false)).toBeUndefined();
  });

  it('returns undefined when the adapter does not implement getPendingChange', () => {
    const adapter: ChangeHistoryAdapter = {
      listChanges: jest.fn(),
      getChange: jest.fn(),
    };

    expect(resolveChangeHistoryPendingChange(adapter, true)).toBeUndefined();
  });
});
