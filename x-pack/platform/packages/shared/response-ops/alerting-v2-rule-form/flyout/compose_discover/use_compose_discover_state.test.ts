/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInitialState, reducer, getSandboxTabConfig } from './use_compose_discover_state';
import type { ComposeDiscoverState } from './types';

// ── helpers ───────────────────────────────────────────────────────────────────

const FULL_QUERY = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count > 100';
const BASE_QUERY = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_BLOCK = '| WHERE count > 100';
const RECOVERY_FULL = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count < 100';
const RECOVERY_BLOCK = '| WHERE count < 100';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

// ── createInitialState ────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('creates default state for create mode', () => {
    const state = createInitialState({ mode: 'create' });

    expect(state.mode).toBe('create');
    expect(state.tracking).toBe(false);
    expect(state.fullQuery).toBe('');
    expect(state.childOpen).toBe(true);
    expect(state.queryCommitted).toBe(false);
  });

  it('seeds fullQuery and marks committed in edit mode', () => {
    const state = createInitialState({ mode: 'edit', initialQuery: FULL_QUERY });

    expect(state.mode).toBe('edit');
    expect(state.fullQuery).toBe(FULL_QUERY);
    expect(state.childOpen).toBe(false);
    expect(state.queryCommitted).toBe(true);
  });

  it('does not enable tracking when no recovery query is provided', () => {
    const state = createInitialState({ mode: 'edit', initialQuery: FULL_QUERY });

    expect(state.tracking).toBe(false);
    expect(state.baseQuery).toBe('');
    expect(state.alertBlock).toBe('');
    expect(state.recoveryBlock).toBe('');
    expect(state.recoveryType).toBe('default');
  });

  it('enables tracking and reconstructs split when a recovery query is provided', () => {
    const state = createInitialState({
      mode: 'edit',
      initialQuery: FULL_QUERY,
      initialRecoveryQuery: RECOVERY_FULL,
    });

    expect(state.tracking).toBe(true);
    expect(state.recoveryType).toBe('custom');
    expect(state.baseQuery).toBe(BASE_QUERY);
    expect(state.alertBlock).toBe(ALERT_BLOCK);
    expect(state.recoveryBlock).toBe(RECOVERY_BLOCK);
  });
});

// ── reducer: commit actions ───────────────────────────────────────────────────

describe('reducer', () => {
  describe('COMMIT_CHILD_QUERY', () => {
    it('sets fullQuery and marks committed', () => {
      const state = createState({ queryCommitted: false });
      const next = reducer(state, { type: 'COMMIT_CHILD_QUERY', fullQuery: FULL_QUERY });

      expect(next.fullQuery).toBe(FULL_QUERY);
      expect(next.queryCommitted).toBe(true);
      expect(next.childOpen).toBe(false);
    });
  });

  describe('COMMIT_CHILD_SPLIT', () => {
    it('sets split fields and marks committed', () => {
      const state = createState({ tracking: true, queryCommitted: false });
      const next = reducer(state, {
        type: 'COMMIT_CHILD_SPLIT',
        baseQuery: BASE_QUERY,
        alertBlock: ALERT_BLOCK,
        recoveryBlock: RECOVERY_BLOCK,
      });

      expect(next.baseQuery).toBe(BASE_QUERY);
      expect(next.alertBlock).toBe(ALERT_BLOCK);
      expect(next.recoveryBlock).toBe(RECOVERY_BLOCK);
      expect(next.queryCommitted).toBe(true);
      expect(next.childOpen).toBe(false);
    });
  });

  describe('ENABLE_TRACKING → DISABLE_TRACKING roundtrip', () => {
    it('reassembles fullQuery when tracking is disabled', () => {
      let state = createState({ fullQuery: FULL_QUERY, queryCommitted: true });

      state = reducer(state, {
        type: 'ENABLE_TRACKING',
        base: BASE_QUERY,
        alertBlock: ALERT_BLOCK,
      });
      expect(state.tracking).toBe(true);
      expect(state.baseQuery).toBe(BASE_QUERY);
      expect(state.alertBlock).toBe(ALERT_BLOCK);

      state = reducer(state, { type: 'DISABLE_TRACKING' });
      expect(state.tracking).toBe(false);
      expect(state.fullQuery).toBe(`${BASE_QUERY}\n${ALERT_BLOCK}`);
      expect(state.baseQuery).toBe('');
      expect(state.alertBlock).toBe('');
      expect(state.recoveryBlock).toBe('');
    });

    it('ENABLE_TRACKING closes the child so it remounts with fresh local state', () => {
      const state = createState({
        fullQuery: FULL_QUERY,
        queryCommitted: true,
        childOpen: true,
      });

      const next = reducer(state, {
        type: 'ENABLE_TRACKING',
        base: BASE_QUERY,
        alertBlock: ALERT_BLOCK,
      });

      expect(next.childOpen).toBe(false);
    });

    it('DISABLE_TRACKING closes the child so it remounts with fresh local state', () => {
      const state = createState({
        tracking: true,
        baseQuery: BASE_QUERY,
        alertBlock: ALERT_BLOCK,
        queryCommitted: true,
        childOpen: true,
      });

      const next = reducer(state, { type: 'DISABLE_TRACKING' });

      expect(next.childOpen).toBe(false);
    });
  });

  describe('sandbox isolation', () => {
    it('CLOSE_CHILD does not alter split query fields', () => {
      const state = createState({
        tracking: true,
        childOpen: true,
        queryCommitted: true,
        baseQuery: BASE_QUERY,
        alertBlock: ALERT_BLOCK,
        recoveryBlock: RECOVERY_BLOCK,
      });

      const next = reducer(state, { type: 'CLOSE_CHILD' });

      expect(next.childOpen).toBe(false);
      expect(next.baseQuery).toBe(BASE_QUERY);
      expect(next.alertBlock).toBe(ALERT_BLOCK);
      expect(next.recoveryBlock).toBe(RECOVERY_BLOCK);
    });

    it('only COMMIT_CHILD_SPLIT updates baseQuery/alertBlock/recoveryBlock', () => {
      const state = createState({
        tracking: true,
        queryCommitted: true,
        baseQuery: BASE_QUERY,
        alertBlock: ALERT_BLOCK,
        recoveryBlock: '',
      });

      const newBase = 'FROM new-*\n| STATS c = COUNT(*)';
      const newAlert = '| WHERE c > 50';
      const newRecovery = '| WHERE c < 50';

      const next = reducer(state, {
        type: 'COMMIT_CHILD_SPLIT',
        baseQuery: newBase,
        alertBlock: newAlert,
        recoveryBlock: newRecovery,
      });

      expect(next.baseQuery).toBe(newBase);
      expect(next.alertBlock).toBe(newAlert);
      expect(next.recoveryBlock).toBe(newRecovery);
      expect(next.queryCommitted).toBe(true);
      expect(next.childOpen).toBe(false);
    });
  });

  describe('SET_RECOVERY_TYPE', () => {
    it('seeds recovery block from alert block when switching to custom', () => {
      const state = createState({
        tracking: true,
        alertBlock: ALERT_BLOCK,
        recoveryBlock: '',
        recoveryType: 'default',
      });

      const next = reducer(state, { type: 'SET_RECOVERY_TYPE', recoveryType: 'custom' });

      expect(next.recoveryType).toBe('custom');
      expect(next.recoveryBlock).toBe(RECOVERY_BLOCK);
      expect(next.childOpen).toBe(true);
      expect(next.activeTab).toBe('recovery');
    });

    it('preserves existing recovery block when switching to custom', () => {
      const existing = '| WHERE status == "ok"';
      const state = createState({
        tracking: true,
        alertBlock: ALERT_BLOCK,
        recoveryBlock: existing,
        recoveryType: 'default',
      });

      const next = reducer(state, { type: 'SET_RECOVERY_TYPE', recoveryType: 'custom' });

      expect(next.recoveryBlock).toBe(existing);
    });
  });
});

// ── getSandboxTabConfig ───────────────────────────────────────────────────────

describe('getSandboxTabConfig', () => {
  it('returns single when tracking is off', () => {
    const state = createState({ tracking: false });
    expect(getSandboxTabConfig(state)).toEqual({ type: 'single' });
  });

  it('returns base-alert on alertCondition step with tracking', () => {
    const state = createState({ tracking: true, step: 0 });
    expect(getSandboxTabConfig(state)).toEqual({ type: 'base-alert' });
  });

  it('returns base-recovery on recoveryCondition step with custom recovery', () => {
    const state = createState({ tracking: true, step: 1, recoveryType: 'custom' });
    expect(getSandboxTabConfig(state)).toEqual({ type: 'base-recovery' });
  });

  it('returns single on recoveryCondition step with default recovery', () => {
    const state = createState({ tracking: true, step: 1, recoveryType: 'default' });
    expect(getSandboxTabConfig(state)).toEqual({ type: 'single' });
  });
});
