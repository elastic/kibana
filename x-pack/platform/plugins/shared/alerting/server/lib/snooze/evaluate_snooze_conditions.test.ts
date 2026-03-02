/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateSnoozeConditions } from './evaluate_snooze_conditions';
import type { AlertSnoozeConfig } from './evaluate_snooze_conditions';

describe('evaluateSnoozeConditions', () => {
  describe('time-based expiry', () => {
    it('returns shouldUnmute: true when the expiry time is in the past', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      };
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain('Time expiry reached');
    });

    it('returns shouldUnmute: false when the expiry time is in the future', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('field_change condition', () => {
    it('returns shouldUnmute: true when field has changed from snapshot', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
            snapshotValue: 'critical',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'medium',
      });
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain('changed from');
    });

    it('returns shouldUnmute: false when field has not changed', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
            snapshotValue: 'critical',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'critical',
      });
      expect(result.shouldUnmute).toBe(false);
    });

    it('returns shouldUnmute: false when snapshotValue is undefined', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'medium',
      });
      expect(result.shouldUnmute).toBe(false);
    });

    it('returns shouldUnmute: false when monitored field is missing from alert data', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
            snapshotValue: 'critical',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(false);
    });

    it('returns shouldUnmute: false for severity_change when field is absent', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'severity_change',
            field: 'kibana.alert.severity',
            snapshotValue: 'critical',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('severity_equals condition', () => {
    it('returns shouldUnmute: true when field equals target value', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'low',
      });
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain('reached target value');
    });

    it('returns shouldUnmute: false when field does not equal target', () => {
      const config: AlertSnoozeConfig = {
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'critical',
      });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('compound conditions (any operator)', () => {
    it('returns shouldUnmute: true if any condition is met', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // future, not expired
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
        conditionOperator: 'any',
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'low',
      });
      expect(result.shouldUnmute).toBe(true);
    });
  });

  describe('compound conditions (all operator)', () => {
    it('returns shouldUnmute: false if only some conditions are met', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // future, not expired
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
        conditionOperator: 'all',
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'low',
      });
      // severity condition met, but time not expired -> not all met
      expect(result.shouldUnmute).toBe(false);
    });

    it('returns shouldUnmute: true if all conditions are met', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() - 60000).toISOString(), // past, expired
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
        conditionOperator: 'all',
      };
      const result = evaluateSnoozeConditions(config, {
        'kibana.alert.severity': 'low',
      });
      expect(result.shouldUnmute).toBe(true);
    });
  });

  describe('indefinite mute (no conditions, no expiry)', () => {
    it('returns shouldUnmute: false', () => {
      const config: AlertSnoozeConfig = {};
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('micro-benchmarks', () => {
    const runTimingLoop = (fn: () => void, runs: number): { totalMs: number; meanMs: number } => {
      const start = performance.now();
      for (let i = 0; i < runs; i++) {
        fn();
      }
      const totalMs = performance.now() - start;
      return { totalMs, meanMs: totalMs / runs };
    };

    it('evaluateSnoozeConditions many calls with time-only config', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      const runs = 500;
      const { meanMs } = runTimingLoop(() => {
        evaluateSnoozeConditions(config, {});
      }, runs);
      expect(meanMs).toBeLessThan(0.1);
    });

    it('evaluateSnoozeConditions many calls with 10 conditions', () => {
      const config: AlertSnoozeConfig = {
        conditions: Array.from({ length: 10 }, (_, i) => ({
          type: 'field_change' as const,
          field: `kibana.alert.field_${i}`,
          snapshotValue: `value_${i}`,
        })),
        conditionOperator: 'any',
      };
      const alertData: Record<string, unknown> = {};
      for (let i = 0; i < 10; i++) {
        alertData[`kibana.alert.field_${i}`] = `other_${i}`;
      }
      const runs = 200;
      const { meanMs } = runTimingLoop(() => {
        evaluateSnoozeConditions(config, alertData);
      }, runs);
      expect(meanMs).toBeLessThan(1);
    });

    it('evaluateSnoozeConditions many alerts in loop (snoozedInstances-style)', () => {
      const config: AlertSnoozeConfig = {
        expiresAt: new Date(Date.now() - 60000).toISOString(),
        conditions: [{ type: 'severity_equals', field: 'kibana.alert.severity', value: 'low' }],
      };
      const runs = 300;
      const { meanMs } = runTimingLoop(() => {
        for (let a = 0; a < 50; a++) {
          evaluateSnoozeConditions(config, {
            'kibana.alert.instance.id': `alert-${a}`,
            'kibana.alert.severity': 'low',
          });
        }
      }, runs);
      expect(meanMs).toBeLessThan(2);
    });
  });
});
