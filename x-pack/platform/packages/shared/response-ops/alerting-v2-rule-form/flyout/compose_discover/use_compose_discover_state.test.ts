/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInitialState, reducer, getSandboxTabConfig } from './use_compose_discover_state';
import type { ComposeDiscoverState } from './types';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

// ── createInitialState ────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('creates default state for create mode (signal, tracking off)', () => {
    const state = createInitialState({ mode: 'create' });

    expect(state.mode).toBe('create');
    expect(state.tracking).toBe(false);
    expect(state.childOpen).toBe(true);
    expect(state.queryCommitted).toBe(false);
  });

  it('enables tracking when initialKind is alert', () => {
    const state = createInitialState({ mode: 'create', initialKind: 'alert' });

    expect(state.tracking).toBe(true);
    expect(state.recoveryType).toBe('default');
  });

  it('sets tracking false and childOpen false in edit mode with signal kind', () => {
    const state = createInitialState({ mode: 'edit', initialKind: 'signal' });

    expect(state.tracking).toBe(false);
    expect(state.childOpen).toBe(false);
    expect(state.queryCommitted).toBe(true);
  });

  it('sets tracking true in edit mode with alert kind', () => {
    const state = createInitialState({ mode: 'edit', initialKind: 'alert' });

    expect(state.tracking).toBe(true);
    expect(state.childOpen).toBe(false);
    expect(state.queryCommitted).toBe(true);
    expect(state.recoveryType).toBe('default');
  });

  it('applies initialRecoveryType only when kind is alert', () => {
    const withTracking = createInitialState({
      mode: 'edit',
      initialKind: 'alert',
      initialRecoveryType: 'custom',
    });
    expect(withTracking.recoveryType).toBe('custom');

    const withoutTracking = createInitialState({
      mode: 'edit',
      initialKind: 'signal',
      initialRecoveryType: 'custom',
    });
    expect(withoutTracking.recoveryType).toBe('default');
  });
});

// ── reducer ───────────────────────────────────────────────────────────────────

describe('reducer', () => {
  describe('ENABLE_TRACKING', () => {
    it('sets tracking true, opens child, resets to step 0', () => {
      const state = createState({ tracking: false, step: 2, childOpen: false });
      const next = reducer(state, { type: 'ENABLE_TRACKING' });

      expect(next.tracking).toBe(true);
      expect(next.childOpen).toBe(true);
      expect(next.step).toBe(0);
    });
  });

  describe('DISABLE_TRACKING', () => {
    it('sets tracking false, closes child, resets step and recoveryType', () => {
      const state = createState({
        tracking: true,
        step: 1,
        childOpen: true,
        recoveryType: 'custom',
      });
      const next = reducer(state, { type: 'DISABLE_TRACKING' });

      expect(next.tracking).toBe(false);
      expect(next.childOpen).toBe(false);
      expect(next.step).toBe(0);
      expect(next.recoveryType).toBe('default');
    });
  });

  describe('COMMIT_QUERY', () => {
    it('marks queryCommitted and closes child (non-yaml mode)', () => {
      const state = createState({ queryCommitted: false, childOpen: true, yamlMode: false });
      const next = reducer(state, { type: 'COMMIT_QUERY' });

      expect(next.queryCommitted).toBe(true);
      expect(next.childOpen).toBe(false);
    });

    it('keeps childOpen when in yaml mode', () => {
      const state = createState({ queryCommitted: false, childOpen: true, yamlMode: true });
      const next = reducer(state, { type: 'COMMIT_QUERY' });

      expect(next.queryCommitted).toBe(true);
      expect(next.childOpen).toBe(true);
    });
  });

  describe('SET_RECOVERY_TYPE', () => {
    it('opens child to recovery tab when switching to custom', () => {
      const state = createState({ tracking: true, recoveryType: 'default' });
      const next = reducer(state, { type: 'SET_RECOVERY_TYPE', recoveryType: 'custom' });

      expect(next.recoveryType).toBe('custom');
      expect(next.childOpen).toBe(true);
      expect(next.activeTab).toBe('recovery');
    });

    it('does not open child when switching to default', () => {
      const state = createState({ tracking: true, recoveryType: 'custom', childOpen: false });
      const next = reducer(state, { type: 'SET_RECOVERY_TYPE', recoveryType: 'default' });

      expect(next.recoveryType).toBe('default');
      expect(next.childOpen).toBe(false);
    });
  });

  describe('CLOSE_CHILD', () => {
    it('sets childOpen false without changing other fields', () => {
      const state = createState({ tracking: true, childOpen: true, queryCommitted: true });
      const next = reducer(state, { type: 'CLOSE_CHILD' });

      expect(next.childOpen).toBe(false);
      expect(next.tracking).toBe(true);
      expect(next.queryCommitted).toBe(true);
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
