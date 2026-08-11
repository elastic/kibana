/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';
import { resolveChangeHistorySupports } from './resolve_change_history_supports';

const pendingChange: ChangeHistoryPendingChange = {
  id: '__pending__',
  timestamp: '2026-07-03T12:00:00.000Z',
  actor: { name: 'You' },
  action: 'Unsaved changes',
  snapshot: {},
};

const adapterWithRestore: ChangeHistoryAdapter = {
  listChanges: jest.fn(),
  getChange: jest.fn(),
  restoreChange: jest.fn(),
};

const adapterWithoutRestore: ChangeHistoryAdapter = {
  listChanges: jest.fn(),
  getChange: jest.fn(),
};

const adapterWithPendingChange: ChangeHistoryAdapter = {
  listChanges: jest.fn(),
  getChange: jest.fn(),
  getPendingChange: () => pendingChange,
};

describe('resolveChangeHistorySupports', () => {
  it('enables compare by default', () => {
    expect(resolveChangeHistorySupports(adapterWithRestore)).toEqual({
      compare: true,
      restore: false,
      unsavedChanges: false,
    });
  });

  it('disables compare when the feature flag is off', () => {
    expect(
      resolveChangeHistorySupports(adapterWithRestore, {
        features: { compare: false },
      })
    ).toEqual({ compare: false, restore: false, unsavedChanges: false });
  });

  it('enables restore when feature, adapter, and permissions allow it', () => {
    expect(
      resolveChangeHistorySupports(adapterWithRestore, {
        features: { restore: true },
        permissions: { canRestore: true },
      })
    ).toEqual({ compare: true, restore: true, unsavedChanges: false });
  });

  it('disables restore when the feature flag is off', () => {
    expect(
      resolveChangeHistorySupports(adapterWithRestore, {
        features: { restore: false },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: false });
  });

  it('disables restore when the adapter does not implement restoreChange', () => {
    expect(
      resolveChangeHistorySupports(adapterWithoutRestore, {
        features: { restore: true },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: false });
  });

  it('disables restore when permissions are omitted', () => {
    expect(
      resolveChangeHistorySupports(adapterWithRestore, {
        features: { restore: true },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: false });
  });

  it('disables restore when permissions deny it', () => {
    expect(
      resolveChangeHistorySupports(adapterWithRestore, {
        features: { restore: true },
        permissions: { canRestore: false },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: false });
  });

  it('enables unsavedChanges when feature and adapter allow it', () => {
    expect(
      resolveChangeHistorySupports(adapterWithPendingChange, {
        features: { unsavedChanges: true },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: true });
  });

  it('disables unsavedChanges when the feature flag is off', () => {
    expect(
      resolveChangeHistorySupports(adapterWithPendingChange, {
        features: { unsavedChanges: false },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: false });
  });

  it('disables unsavedChanges when the adapter does not implement getPendingChange', () => {
    expect(
      resolveChangeHistorySupports(adapterWithRestore, {
        features: { unsavedChanges: true },
      })
    ).toEqual({ compare: true, restore: false, unsavedChanges: false });
  });
});
