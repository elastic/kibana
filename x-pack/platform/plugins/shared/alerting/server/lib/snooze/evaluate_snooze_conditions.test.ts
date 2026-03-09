/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateSnoozeConditions, toComparableString } from './evaluate_snooze_conditions';
import type { SnoozedInstanceConfig } from '../snooze_types';

describe('evaluateSnoozeConditions', () => {
  describe('time-based expiry', () => {
    it('returns shouldUnmute: true when the expiry time is in the past', () => {
      const config: SnoozedInstanceConfig = {
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      };
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain('Time expiry reached');
    });

    it('returns shouldUnmute: false when the expiry time is in the future', () => {
      const config: SnoozedInstanceConfig = {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('field_change condition', () => {
    it('returns shouldUnmute: true when field has changed from snapshot', () => {
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {
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
      const config: SnoozedInstanceConfig = {};
      const result = evaluateSnoozeConditions(config, {});
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('type coercion via toComparableString', () => {
    it('handles numeric field values correctly (no change)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'host.risk_score', snapshotValue: '42' }],
      };
      const result = evaluateSnoozeConditions(config, { 'host.risk_score': 42 });
      expect(result.shouldUnmute).toBe(false);
    });

    it('handles numeric field values correctly (change detected)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'host.risk_score', snapshotValue: '42' }],
      };
      const result = evaluateSnoozeConditions(config, { 'host.risk_score': 99 });
      expect(result.shouldUnmute).toBe(true);
    });

    it('handles boolean field values correctly (no change)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'alert.suppressed', snapshotValue: 'true' }],
      };
      const result = evaluateSnoozeConditions(config, { 'alert.suppressed': true });
      expect(result.shouldUnmute).toBe(false);
    });

    it('handles boolean field values correctly (change detected)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'alert.suppressed', snapshotValue: 'true' }],
      };
      const result = evaluateSnoozeConditions(config, { 'alert.suppressed': false });
      expect(result.shouldUnmute).toBe(true);
    });

    it('handles Date object field values correctly (no change)', () => {
      const iso = '2025-06-15T10:30:00.000Z';
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'event.created', snapshotValue: iso }],
      };
      const result = evaluateSnoozeConditions(config, {
        'event.created': new Date(iso),
      });
      expect(result.shouldUnmute).toBe(false);
    });

    it('handles Date object field values correctly (change detected)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [
          {
            type: 'field_change',
            field: 'event.created',
            snapshotValue: '2025-06-15T10:30:00.000Z',
          },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        'event.created': new Date('2025-07-01T00:00:00.000Z'),
      });
      expect(result.shouldUnmute).toBe(true);
    });

    it('bails out for object field values (condition not met)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'host.geo', snapshotValue: 'something' }],
      };
      const result = evaluateSnoozeConditions(config, {
        'host.geo': { lat: 40.7, lon: -74.0 },
      });
      expect(result.shouldUnmute).toBe(false);
    });

    it('bails out for array field values (condition not met)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'tags', snapshotValue: '1,2,3' }],
      };
      const result = evaluateSnoozeConditions(config, { tags: [1, 2, 3] });
      expect(result.shouldUnmute).toBe(false);
    });

    it('bails out for NaN field values (condition not met)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'field_change', field: 'score', snapshotValue: '42' }],
      };
      const result = evaluateSnoozeConditions(config, { score: NaN });
      expect(result.shouldUnmute).toBe(false);
    });

    it('bails out for invalid Date field values (condition not met)', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [
          { type: 'field_change', field: 'ts', snapshotValue: '2025-01-01T00:00:00.000Z' },
        ],
      };
      const result = evaluateSnoozeConditions(config, {
        ts: new Date('not-a-date'),
      });
      expect(result.shouldUnmute).toBe(false);
    });

    it('handles severity_equals with numeric current value', () => {
      const config: SnoozedInstanceConfig = {
        conditions: [{ type: 'severity_equals', field: 'risk_level', value: '3' }],
      };
      const result = evaluateSnoozeConditions(config, { risk_level: 3 });
      expect(result.shouldUnmute).toBe(true);
    });
  });
});

describe('toComparableString', () => {
  it('returns undefined for null', () => {
    expect(toComparableString(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(toComparableString(undefined)).toBeUndefined();
  });

  it('returns string as-is', () => {
    expect(toComparableString('critical')).toBe('critical');
  });

  it('returns "true" for boolean true', () => {
    expect(toComparableString(true)).toBe('true');
  });

  it('returns "false" for boolean false', () => {
    expect(toComparableString(false)).toBe('false');
  });

  it('returns string representation for finite numbers', () => {
    expect(toComparableString(42)).toBe('42');
    expect(toComparableString(3.14)).toBe('3.14');
    expect(toComparableString(0)).toBe('0');
    expect(toComparableString(-1)).toBe('-1');
  });

  it('returns undefined for NaN', () => {
    expect(toComparableString(NaN)).toBeUndefined();
  });

  it('returns undefined for Infinity', () => {
    expect(toComparableString(Infinity)).toBeUndefined();
    expect(toComparableString(-Infinity)).toBeUndefined();
  });

  it('returns ISO string for Date objects', () => {
    const date = new Date('2025-06-15T10:30:00.000Z');
    expect(toComparableString(date)).toBe('2025-06-15T10:30:00.000Z');
  });

  it('returns undefined for invalid Date objects', () => {
    expect(toComparableString(new Date('not-a-date'))).toBeUndefined();
  });

  it('returns undefined for plain objects', () => {
    expect(toComparableString({ key: 'value' })).toBeUndefined();
  });

  it('returns undefined for arrays', () => {
    expect(toComparableString([1, 2, 3])).toBeUndefined();
  });
});
