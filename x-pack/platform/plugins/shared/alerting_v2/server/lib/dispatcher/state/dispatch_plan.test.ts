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

  it('reports emptiness', () => {
    const plan = DispatchPlan.of({
      toDispatch: [createActionGroup({ id: 'g1', episodes: [ep1] })],
      throttled: [createActionGroup({ id: 'g2', episodes: [ep2] })],
      dispatchable: [ep1, ep2],
    });

    expect(plan.isEmpty()).toBe(false);
    expect(DispatchPlan.empty().isEmpty()).toBe(true);
  });

  describe('unmatched', () => {
    it('contains the dispatchable episodes that landed in no group', () => {
      const plan = DispatchPlan.of({
        toDispatch: [createActionGroup({ id: 'g1', episodes: [ep1] })],
        throttled: [createActionGroup({ id: 'g2', episodes: [ep2] })],
        dispatchable: [ep1, ep2, ep3],
      });

      expect(plan.unmatched).toEqual([ep3]);
    });

    it('contains everything dispatchable when no groups were planned', () => {
      const plan = DispatchPlan.of({ toDispatch: [], throttled: [], dispatchable: [ep1, ep2] });

      expect(plan.unmatched).toEqual([ep1, ep2]);
    });

    it('is empty when every dispatchable episode is grouped', () => {
      const plan = DispatchPlan.of({
        toDispatch: [createActionGroup({ id: 'g1', episodes: [ep1, ep2] })],
        throttled: [],
        dispatchable: [ep1, ep2],
      });

      expect(plan.unmatched).toEqual([]);
    });
  });
});
