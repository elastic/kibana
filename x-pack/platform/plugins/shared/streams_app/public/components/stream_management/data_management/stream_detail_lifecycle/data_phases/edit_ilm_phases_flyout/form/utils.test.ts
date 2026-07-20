/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRelativeBoundsInMs } from './utils';

describe('edit_ilm_phases_flyout/form/utils', () => {
  describe('getRelativeBoundsInMs()', () => {
    const phases = ['warm', 'cold', 'frozen', 'delete'] as const;
    type Phase = (typeof phases)[number];

    it('returns default bounds when phase is not in the ordered list', () => {
      const { lowerBoundMs, lowerBoundPhase, upperBoundMs, upperBoundPhase } =
        getRelativeBoundsInMs(phases, 'hot' as unknown as Phase, () => null);
      expect(lowerBoundMs).toBe(0);
      expect(lowerBoundPhase).toBeUndefined();
      expect(upperBoundMs).toBeUndefined();
      expect(upperBoundPhase).toBeUndefined();
    });

    it('computes bounds and binding phases from previous/max and next/min values', () => {
      const values: Record<Phase, number | null> = {
        warm: 20,
        cold: 30,
        frozen: 40,
        delete: 60,
      };

      const get = (p: Phase) => values[p];

      expect(getRelativeBoundsInMs(phases, 'warm', get)).toEqual({
        lowerBoundMs: 0,
        lowerBoundPhase: undefined,
        upperBoundMs: 30,
        upperBoundPhase: 'cold',
      });
      expect(getRelativeBoundsInMs(phases, 'cold', get)).toEqual({
        lowerBoundMs: 20,
        lowerBoundPhase: 'warm',
        upperBoundMs: 40,
        upperBoundPhase: 'frozen',
      });
      expect(getRelativeBoundsInMs(phases, 'frozen', get)).toEqual({
        lowerBoundMs: 30,
        lowerBoundPhase: 'cold',
        upperBoundMs: 60,
        upperBoundPhase: 'delete',
      });
      expect(getRelativeBoundsInMs(phases, 'delete', get)).toEqual({
        lowerBoundMs: 40,
        lowerBoundPhase: 'frozen',
        upperBoundMs: undefined,
        upperBoundPhase: undefined,
      });
    });

    it('attributes ties to the phase closest to the current one', () => {
      const values: Record<Phase, number | null> = {
        warm: 30,
        cold: 30,
        frozen: null,
        delete: null,
      };

      const get = (p: Phase) => values[p];

      // For frozen: warm and cold both have 30 — the closest previous phase (cold) is the bound.
      expect(getRelativeBoundsInMs(phases, 'frozen', get)).toEqual({
        lowerBoundMs: 30,
        lowerBoundPhase: 'cold',
        upperBoundMs: undefined,
        upperBoundPhase: undefined,
      });

      // For warm: cold and (hypothetically equal) later phases — the closest next phase wins.
      const upperTie: Record<Phase, number | null> = {
        warm: null,
        cold: 30,
        frozen: 30,
        delete: null,
      };
      expect(getRelativeBoundsInMs(phases, 'warm', (p) => upperTie[p])).toEqual({
        lowerBoundMs: 0,
        lowerBoundPhase: undefined,
        upperBoundMs: 30,
        upperBoundPhase: 'cold',
      });
    });

    it('ignores phases that return null', () => {
      const values: Record<Phase, number | null> = {
        warm: 20,
        cold: null,
        frozen: 40,
        delete: null,
      };

      const get = (p: Phase) => values[p];

      // For frozen: previous = max(warm=20, cold=null) = 20, bound by warm.
      expect(getRelativeBoundsInMs(phases, 'frozen', get)).toEqual({
        lowerBoundMs: 20,
        lowerBoundPhase: 'warm',
        upperBoundMs: undefined,
        upperBoundPhase: undefined,
      });

      // For cold: next = min(frozen=40) = 40 (delete ignored).
      expect(getRelativeBoundsInMs(phases, 'cold', get)).toEqual({
        lowerBoundMs: 20,
        lowerBoundPhase: 'warm',
        upperBoundMs: 40,
        upperBoundPhase: 'frozen',
      });
    });

    it('allows overriding default lower bound without attributing it to a phase', () => {
      const get = () => null;
      expect(getRelativeBoundsInMs(phases, 'warm', get, { defaultLowerBoundMs: 123 })).toEqual({
        lowerBoundMs: 123,
        lowerBoundPhase: undefined,
        upperBoundMs: undefined,
        upperBoundPhase: undefined,
      });
    });

    it('does not attribute a previous phase that only matches the default lower bound', () => {
      const values: Record<Phase, number | null> = {
        warm: 0,
        cold: null,
        frozen: null,
        delete: null,
      };
      // warm's value equals the default bound (0) — it does not constrain cold.
      expect(getRelativeBoundsInMs(phases, 'cold', (p) => values[p])).toEqual({
        lowerBoundMs: 0,
        lowerBoundPhase: undefined,
        upperBoundMs: undefined,
        upperBoundPhase: undefined,
      });
    });
  });
});
