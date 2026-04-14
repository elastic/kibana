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
      const { lowerBoundMs, upperBoundMs } = getRelativeBoundsInMs(
        phases,
        'hot' as unknown as Phase,
        () => null
      );
      expect(lowerBoundMs).toBe(0);
      expect(upperBoundMs).toBeUndefined();
    });

    it('computes bounds from previous/max and next/min values', () => {
      const values: Record<Phase, number | null> = {
        warm: 20,
        cold: 30,
        frozen: 40,
        delete: 60,
      };

      const get = (p: Phase) => values[p];

      expect(getRelativeBoundsInMs(phases, 'warm', get)).toEqual({
        lowerBoundMs: 0,
        upperBoundMs: 30,
      });
      expect(getRelativeBoundsInMs(phases, 'cold', get)).toEqual({
        lowerBoundMs: 20,
        upperBoundMs: 40,
      });
      expect(getRelativeBoundsInMs(phases, 'frozen', get)).toEqual({
        lowerBoundMs: 30,
        upperBoundMs: 60,
      });
      expect(getRelativeBoundsInMs(phases, 'delete', get)).toEqual({
        lowerBoundMs: 40,
        upperBoundMs: undefined,
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

      // For cold: previous=max(warm)=20, next=min(frozen)=40 (delete ignored)
      expect(getRelativeBoundsInMs(phases, 'cold', get)).toEqual({
        lowerBoundMs: 20,
        upperBoundMs: 40,
      });
    });

    it('allows overriding default lower bound', () => {
      const get = () => null;
      expect(getRelativeBoundsInMs(phases, 'warm', get, { defaultLowerBoundMs: 123 })).toEqual({
        lowerBoundMs: 123,
        upperBoundMs: undefined,
      });
    });
  });
});
