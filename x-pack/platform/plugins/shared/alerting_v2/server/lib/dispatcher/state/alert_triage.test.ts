/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlert } from '../fixtures/test_utils';
import { AlertTriage } from './alert_triage';

describe('AlertTriage', () => {
  describe('partition', () => {
    it('splits alerts by the returned reason', () => {
      const keep = createAlert({ alert_id: 'keep' });
      const drop = createAlert({ alert_id: 'drop' });

      const triage = AlertTriage.partition([keep, drop], (alert) =>
        alert.alert_id === 'drop' ? 'ack' : undefined
      );

      expect(triage.dispatchable).toEqual([keep]);
      expect(triage.suppressed).toEqual([{ ...drop, reason: 'ack' }]);
    });
  });

  describe('suppressDispatchableWhere', () => {
    it('moves newly suppressed alerts after the already-suppressed ones', () => {
      const initial = AlertTriage.partition(
        [
          createAlert({ alert_id: 'e1' }),
          createAlert({ alert_id: 'e2' }),
          createAlert({ alert_id: 'e3' }),
        ],
        (alert) => (alert.alert_id === 'e1' ? 'snooze' : undefined)
      );

      const result = initial.suppressDispatchableWhere((alert) =>
        alert.alert_id === 'e3' ? 'maintenance_window:mw-1' : undefined
      );

      expect(result.dispatchable.map((e) => e.alert_id)).toEqual(['e2']);
      expect(result.suppressed.map((e) => [e.alert_id, e.reason])).toEqual([
        ['e1', 'snooze'],
        ['e3', 'maintenance_window:mw-1'],
      ]);
      // The original instance is untouched.
      expect(initial.dispatchable).toHaveLength(2);
      expect(initial.suppressed).toHaveLength(1);
    });

    it('returns the same instance when nothing is newly suppressed', () => {
      const initial = AlertTriage.partition([createAlert({ alert_id: 'e1' })], () => undefined);

      expect(initial.suppressDispatchableWhere(() => undefined)).toBe(initial);
    });
  });

  describe('mapDispatchable', () => {
    it('replaces dispatchable alerts 1:1 and keeps suppressed intact', () => {
      const initial = AlertTriage.partition(
        [createAlert({ alert_id: 'e1' }), createAlert({ alert_id: 'e2' })],
        (alert) => (alert.alert_id === 'e2' ? 'ack' : undefined)
      );

      const result = initial.mapDispatchable((alert) => ({ ...alert, data: { a: 1 } }));

      expect(result.dispatchable).toEqual([
        expect.objectContaining({ alert_id: 'e1', data: { a: 1 } }),
      ]);
      expect(result.suppressed).toBe(initial.suppressed);
    });
  });

  describe('dispatchable accessors', () => {
    const triage = AlertTriage.partition(
      [
        createAlert({ alert_id: 'e1', rule_id: 'r1' }),
        createAlert({ alert_id: 'e1', rule_id: 'r1' }),
        createAlert({ alert_id: 'e2', rule_id: null, source: 'pagerduty' }),
      ],
      () => undefined
    );

    it('exposes unique dispatchable alert ids', () => {
      expect(triage.dispatchableAlertIds()).toEqual(['e1', 'e2']);
    });

    it('exposes unique non-null dispatchable rule ids', () => {
      expect(triage.dispatchableRuleIds()).toEqual(['r1']);
    });

    it('reports dispatchable presence', () => {
      expect(triage.hasDispatchable()).toBe(true);
      expect(AlertTriage.empty().hasDispatchable()).toBe(false);
    });
  });
});
