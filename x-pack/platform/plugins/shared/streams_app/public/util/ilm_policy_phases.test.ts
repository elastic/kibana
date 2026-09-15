/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyPhases } from '@kbn/streams-schema';

import { getILMRatios, orderIlmPhases } from './ilm_policy_phases';

describe('ilm_policy_phases', () => {
  describe('orderIlmPhases', () => {
    it('should order phases correctly when all phases are present', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms' },
        warm: { name: 'warm', min_age: '1d' },
        cold: { name: 'cold', min_age: '7d' },
        frozen: { name: 'frozen', min_age: '30d' },
        delete: { name: 'delete', min_age: '365d' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = orderIlmPhases(phases);

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('hot');
      expect(result[1].name).toBe('warm');
      expect(result[2].name).toBe('cold');
      expect(result[3].name).toBe('frozen');
      expect(result[4].name).toBe('delete');
    });

    it('should handle missing phases by filtering them out', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms' },
        warm: undefined,
        cold: { name: 'cold', min_age: '7d' },
        frozen: undefined,
        delete: { name: 'delete', min_age: '365d' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = orderIlmPhases(phases);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('hot');
      expect(result[1].name).toBe('cold');
      expect(result[2].name).toBe('delete');
    });

    it('should handle only hot phase', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms' },
        warm: undefined,
        cold: undefined,
        frozen: undefined,
        delete: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = orderIlmPhases(phases);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('hot');
    });

    it('should handle all phases being undefined', () => {
      const phases: IlmPolicyPhases = {
        hot: undefined,
        warm: undefined,
        cold: undefined,
        frozen: undefined,
        delete: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = orderIlmPhases(phases);

      expect(result).toHaveLength(0);
    });

    it('should preserve the correct order even if only some phases exist', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms' },
        warm: undefined,
        cold: undefined,
        frozen: { name: 'frozen', min_age: '30d' },
        delete: { name: 'delete', min_age: '365d' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = orderIlmPhases(phases);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('hot');
      expect(result[1].name).toBe('frozen');
      expect(result[2].name).toBe('delete');
    });
  });

  describe('getILMRatios', () => {
    it('should return undefined if phases is undefined', () => {
      expect(getILMRatios(undefined)).toBeUndefined();
    });

    it('should return undefined if phases is an empty object', () => {
      expect(getILMRatios({ phases: {} })).toBeUndefined();
    });

    it('should calculate grow ratios correctly for multiple phases', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000, rollover: {} },
        warm: { name: 'warm', min_age: '1d', size_in_bytes: 1000 },
        cold: { name: 'cold', min_age: '7d', size_in_bytes: 1000 },
        delete: { name: 'delete', min_age: '30d' },
      };

      const result = getILMRatios({ phases });

      expect(result).toHaveLength(4);
      // Phases order is: hot(0ms), warm(1d), cold(7d), delete(30d)
      // hot: duration = 1d - 0 = 1d = 86400s, grow = Math.max(2, Math.round((86400/2592000)*10)) = 2 (Math.max with 2)
      expect(result?.[0]).toMatchObject({ name: 'hot', grow: 2 });
      // warm: duration = 7d - 1d = 6d = 518400s, grow = Math.max(2, Math.round((518400/2592000)*10)) = 2
      expect(result?.[1]).toMatchObject({ name: 'warm', grow: 2 });
      // cold: duration = 30d - 7d = 23d = 1987200s, grow = Math.max(2, Math.round((1987200/2592000)*10)) = 8
      expect(result?.[2]).toMatchObject({ name: 'cold', grow: 8 });
      // totalDuration = 30d = 2592000s
      expect(result?.[3]).toMatchObject({ name: 'delete', grow: false });
    });

    it('should assign default grow value for single phase', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000, rollover: {} },
      };

      const result = getILMRatios({ phases });

      expect(result).toHaveLength(1);
      expect(result?.[0]).toMatchObject({ name: 'hot', grow: 2 });
    });

    it('should handle when all phases with 0 min_age correctly', () => {
      const phases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000, rollover: {} },
        warm: { name: 'warm', min_age: '0d', size_in_bytes: 1000 },
        cold: { name: 'cold', min_age: '0d', size_in_bytes: 1000 },
      };

      const result = getILMRatios({ phases });

      expect(result).toHaveLength(3);
      // Phases order is: hot(0ms), warm(0d), cold(0d)
      // totalDuration = 0 (all phases have 0 min_age)
      // hot is first, no prevPhase, so grow = 2 (not delete phase)
      expect(result?.[0]).toMatchObject({ name: 'hot', grow: 2 });
      // warm: duration diff = 0, totalDuration = 0, ternary returns 2
      expect(result?.[1]).toMatchObject({ name: 'warm', grow: 2 });
      // cold: duration diff = 0, totalDuration = 0, ternary returns 2
      expect(result?.[2]).toMatchObject({ name: 'cold', grow: 2 });
    });
  });
});
