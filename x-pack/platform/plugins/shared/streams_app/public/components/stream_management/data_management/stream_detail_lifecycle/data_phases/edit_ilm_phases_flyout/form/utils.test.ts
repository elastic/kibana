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

    it('returns default lower bound when phase is not in the ordered list', () => {
      const { lowerBoundMs, lowerBoundPhase } = getRelativeBoundsInMs(
        phases,
        'hot' as unknown as Phase,
        () => null
      );
      expect(lowerBoundMs).toBe(0);
      expect(lowerBoundPhase).toBeUndefined();
    });

    it('computes the lower bound and its binding phase from the max of previous values', () => {
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
      });
      expect(getRelativeBoundsInMs(phases, 'cold', get)).toEqual({
        lowerBoundMs: 20,
        lowerBoundPhase: 'warm',
      });
      expect(getRelativeBoundsInMs(phases, 'frozen', get)).toEqual({
        lowerBoundMs: 30,
        lowerBoundPhase: 'cold',
      });
      expect(getRelativeBoundsInMs(phases, 'delete', get)).toEqual({
        lowerBoundMs: 40,
        lowerBoundPhase: 'frozen',
      });
    });

    it('ignores previous phases that return null', () => {
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
      });
    });

    it('allows overriding default lower bound without attributing it to a phase', () => {
      const get = () => null;
      expect(getRelativeBoundsInMs(phases, 'warm', get, { defaultLowerBoundMs: 123 })).toEqual({
        lowerBoundMs: 123,
        lowerBoundPhase: undefined,
      });
    });
  });
});
