/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionGroup, createAlert } from '../fixtures/test_utils';
import { DispatchPlan } from './dispatch_plan';

describe('DispatchPlan', () => {
  const alert1 = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
  const alert2 = createAlert({ rule_id: 'r2', group_hash: 'h2', alert_id: 'e2' });
  const alert3 = createAlert({ rule_id: 'r3', group_hash: 'h3', alert_id: 'e3' });

  it('reports emptiness', () => {
    const plan = DispatchPlan.of({
      toDispatch: [createActionGroup({ id: 'g1', alerts: [alert1] })],
      throttled: [createActionGroup({ id: 'g2', alerts: [alert2] })],
      dispatchable: [alert1, alert2],
    });

    expect(plan.isEmpty()).toBe(false);
    expect(DispatchPlan.empty().isEmpty()).toBe(true);
  });

  describe('alreadyNotified', () => {
    it('defaults to an empty list', () => {
      expect(DispatchPlan.empty().alreadyNotified).toEqual([]);
    });

    it('is not empty when only already-notified groups are planned', () => {
      const plan = DispatchPlan.of({
        toDispatch: [],
        throttled: [],
        alreadyNotified: [createActionGroup({ id: 'g1', alerts: [alert1] })],
        dispatchable: [alert1],
      });

      expect(plan.isEmpty()).toBe(false);
    });

    it('excludes already-notified alerts from unmatched', () => {
      const plan = DispatchPlan.of({
        toDispatch: [],
        throttled: [],
        alreadyNotified: [createActionGroup({ id: 'g1', alerts: [alert1] })],
        dispatchable: [alert1, alert2],
      });

      expect(plan.unmatched).toEqual([alert2]);
    });
  });

  describe('unmatched', () => {
    it('contains the dispatchable alerts that landed in no group', () => {
      const plan = DispatchPlan.of({
        toDispatch: [createActionGroup({ id: 'g1', alerts: [alert1] })],
        throttled: [createActionGroup({ id: 'g2', alerts: [alert2] })],
        dispatchable: [alert1, alert2, alert3],
      });

      expect(plan.unmatched).toEqual([alert3]);
    });

    it('contains everything dispatchable when no groups were planned', () => {
      const plan = DispatchPlan.of({
        toDispatch: [],
        throttled: [],
        dispatchable: [alert1, alert2],
      });

      expect(plan.unmatched).toEqual([alert1, alert2]);
    });

    it('is empty when every dispatchable alert is grouped', () => {
      const plan = DispatchPlan.of({
        toDispatch: [createActionGroup({ id: 'g1', alerts: [alert1, alert2] })],
        throttled: [],
        dispatchable: [alert1, alert2],
      });

      expect(plan.unmatched).toEqual([]);
    });
  });
});
