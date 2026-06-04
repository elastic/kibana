/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncSelectedPhase } from './sync_selected_phase';

describe('syncSelectedPhase', () => {
  it('returns none when selectedPhase is undefined', () => {
    const res = syncSelectedPhase({
      selectedPhase: undefined,
      enabledPhases: ['hot'],
      ensurePhaseEnabledWithDefaults: () => {
        throw new Error('should not be called');
      },
      getFallbackPhase: () => 'hot',
    });

    expect(res).toEqual({ action: 'none' });
  });

  it('returns none when selectedPhase is already enabled', () => {
    const ensure = jest.fn(() => false);

    const res = syncSelectedPhase({
      selectedPhase: 'frozen',
      enabledPhases: ['hot', 'frozen'],
      ensurePhaseEnabledWithDefaults: ensure,
      getFallbackPhase: () => 'delete',
    });

    expect(res).toEqual({ action: 'none' });
    expect(ensure).not.toHaveBeenCalled();
  });

  it('tries to enable the selected phase and returns none when it succeeds', () => {
    const ensure = jest.fn(() => true);
    const fallback = jest.fn(() => 'delete');

    const res = syncSelectedPhase({
      selectedPhase: 'delete',
      enabledPhases: ['hot'],
      ensurePhaseEnabledWithDefaults: ensure,
      getFallbackPhase: fallback,
    });

    expect(ensure).toHaveBeenCalledWith('delete');
    expect(fallback).not.toHaveBeenCalled();
    expect(res).toEqual({ action: 'none' });
  });

  it('falls back when enabling the selected phase is blocked', () => {
    const ensure = jest.fn(() => false);
    const fallback = jest.fn(() => 'delete');

    const res = syncSelectedPhase({
      selectedPhase: 'frozen',
      enabledPhases: ['hot'],
      ensurePhaseEnabledWithDefaults: ensure,
      getFallbackPhase: fallback,
    });

    expect(ensure).toHaveBeenCalledWith('frozen');
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ action: 'set', phase: 'delete' });
  });
});
