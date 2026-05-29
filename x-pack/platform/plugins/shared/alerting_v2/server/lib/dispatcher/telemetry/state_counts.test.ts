/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DispatcherPipelineState } from '../types';
import { computeStateCounts, toSpanLabels } from './state_counts';

const emptyInput: DispatcherPipelineState['input'] = {
  startedAt: new Date('2026-01-01T00:00:00Z'),
  previousStartedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('telemetry/state_counts', () => {
  describe('computeStateCounts', () => {
    it('returns zeros for every key when state has only input', () => {
      expect(computeStateCounts({ input: emptyInput })).toEqual({
        episodes: 0,
        suppressions: 0,
        dispatchable: 0,
        suppressed: 0,
        rules: 0,
        policies: 0,
        matched: 0,
        groups: 0,
        dispatch: 0,
        throttled: 0,
      });
    });

    it('reads lengths from array fields', () => {
      const state = {
        input: emptyInput,
        episodes: [{}, {}, {}],
        dispatchable: [{}, {}],
        matched: [{}],
      } as unknown as DispatcherPipelineState;

      expect(computeStateCounts(state)).toMatchObject({
        episodes: 3,
        dispatchable: 2,
        matched: 1,
      });
    });

    it('reads sizes from Map fields (rules, policies)', () => {
      const state = {
        input: emptyInput,
        rules: new Map([
          ['a', {}],
          ['b', {}],
        ]),
        policies: new Map([['p1', {}]]),
      } as unknown as DispatcherPipelineState;

      expect(computeStateCounts(state)).toMatchObject({ rules: 2, policies: 1 });
    });

    it('always returns every expected key regardless of input shape', () => {
      const counts = computeStateCounts({ input: emptyInput });
      expect(Object.keys(counts).sort()).toEqual(
        [
          'dispatch',
          'dispatchable',
          'episodes',
          'groups',
          'matched',
          'policies',
          'rules',
          'suppressed',
          'suppressions',
          'throttled',
        ].sort()
      );
    });
  });

  describe('toSpanLabels', () => {
    it('prefixes every key with count_ and preserves values', () => {
      expect(
        toSpanLabels({
          episodes: 5,
          suppressions: 0,
          dispatchable: 5,
          suppressed: 0,
          rules: 1,
          policies: 2,
          matched: 3,
          groups: 4,
          dispatch: 2,
          throttled: 1,
        })
      ).toEqual({
        count_episodes: 5,
        count_suppressions: 0,
        count_dispatchable: 5,
        count_suppressed: 0,
        count_rules: 1,
        count_policies: 2,
        count_matched: 3,
        count_groups: 4,
        count_dispatch: 2,
        count_throttled: 1,
      });
    });

    it('emits the zero-value labels (no implicit pruning)', () => {
      const labels = toSpanLabels(computeStateCounts({ input: emptyInput }));
      expect(Object.values(labels).every((v) => v === 0)).toBe(true);
      expect(Object.keys(labels)).toHaveLength(10);
    });
  });
});
