/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionGroup, createAlertEpisode } from '../fixtures/test_utils';
import { DispatchPlan } from './dispatch_plan';

describe('DispatchPlan', () => {
  const ep1 = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
  const ep2 = createAlertEpisode({ rule_id: 'r2', group_hash: 'h2', episode_id: 'e2' });
  const ep3 = createAlertEpisode({ rule_id: 'r3', group_hash: 'h3', episode_id: 'e3' });

  it('reports emptiness and per-bucket episode counts', () => {
    const plan = DispatchPlan.of({
      toDispatch: [createActionGroup({ id: 'g1', episodes: [ep1, ep2] })],
      throttled: [createActionGroup({ id: 'g2', episodes: [ep3] })],
    });

    expect(plan.isEmpty()).toBe(false);
    expect(plan.dispatchEpisodeCount()).toBe(2);
    expect(plan.throttledEpisodeCount()).toBe(1);
    expect(DispatchPlan.empty().isEmpty()).toBe(true);
  });

  describe('unmatchedFrom', () => {
    it('returns dispatchable episodes that landed in no group', () => {
      const plan = DispatchPlan.of({
        toDispatch: [createActionGroup({ id: 'g1', episodes: [ep1] })],
        throttled: [createActionGroup({ id: 'g2', episodes: [ep2] })],
      });

      expect(plan.unmatchedFrom([ep1, ep2, ep3])).toEqual([ep3]);
    });

    it('returns everything when the plan is empty', () => {
      expect(DispatchPlan.empty().unmatchedFrom([ep1, ep2])).toEqual([ep1, ep2]);
    });

    it('memoizes per dispatchable reference', () => {
      const plan = DispatchPlan.of({
        toDispatch: [createActionGroup({ id: 'g1', episodes: [ep1] })],
        throttled: [],
      });
      const dispatchable = [ep1, ep2];

      expect(plan.unmatchedFrom(dispatchable)).toBe(plan.unmatchedFrom(dispatchable));
      // A different input array is recomputed, not served from the cache.
      expect(plan.unmatchedFrom([ep1, ep3])).toEqual([ep3]);
    });
  });
});
