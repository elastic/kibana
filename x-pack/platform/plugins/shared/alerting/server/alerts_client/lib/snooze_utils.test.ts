/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_CONDITION_OPERATOR,
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_SNOOZE_SNAPSHOT,
} from '@kbn/rule-data-utils';
import {
  hasConditionalSnooze,
  hasSnoozeConditions,
  getSnoozeFieldsToPreserve,
} from './snooze_utils';

describe('snooze_utils', () => {
  describe('hasConditionalSnooze', () => {
    it('returns false when alert is undefined', () => {
      expect(hasConditionalSnooze(undefined)).toBe(false);
    });

    it('returns false when alert has no snooze fields', () => {
      expect(hasConditionalSnooze({})).toBe(false);
    });

    it('returns true when alert has expires_at', () => {
      expect(
        hasConditionalSnooze({
          [ALERT_SNOOZE_EXPIRES_AT]: new Date(Date.now() + 60_000).toISOString(),
        })
      ).toBe(true);
    });

    it('returns true when alert has non-empty conditions', () => {
      expect(
        hasConditionalSnooze({
          [ALERT_SNOOZE_CONDITIONS]: [
            { type: 'field_change', field: 'kibana.alert.severity', snapshotValue: 'low' },
          ],
        })
      ).toBe(true);
    });

    it('returns false when alert has empty conditions array', () => {
      expect(hasConditionalSnooze({ [ALERT_SNOOZE_CONDITIONS]: [] })).toBe(false);
    });
  });

  describe('hasSnoozeConditions', () => {
    it('returns false when alert has no conditions', () => {
      expect(hasSnoozeConditions({})).toBe(false);
    });

    it('returns false when conditions is empty array', () => {
      expect(hasSnoozeConditions({ [ALERT_SNOOZE_CONDITIONS]: [] })).toBe(false);
    });

    it('returns true when alert has non-empty conditions', () => {
      expect(
        hasSnoozeConditions({
          [ALERT_SNOOZE_CONDITIONS]: [
            { type: 'severity_equals', field: 'kibana.alert.severity', value: 'medium' },
          ],
        })
      ).toBe(true);
    });
  });

  describe('getSnoozeFieldsToPreserve', () => {
    it('returns only defined snooze fields', () => {
      const expiresAt = new Date(Date.now() + 3600).toISOString();
      const conditions = [
        { type: 'field_change', field: 'kibana.alert.severity', snapshotValue: 'critical' },
      ];
      const result = getSnoozeFieldsToPreserve({
        [ALERT_SNOOZE_EXPIRES_AT]: expiresAt,
        [ALERT_SNOOZE_CONDITIONS]: conditions,
        [ALERT_SNOOZE_CONDITION_OPERATOR]: 'any',
        [ALERT_SNOOZE_SNAPSHOT]: { 'kibana.alert.severity': 'critical' },
      });
      expect(result).toEqual({
        [ALERT_SNOOZE_EXPIRES_AT]: expiresAt,
        [ALERT_SNOOZE_CONDITIONS]: conditions,
        [ALERT_SNOOZE_CONDITION_OPERATOR]: 'any',
        [ALERT_SNOOZE_SNAPSHOT]: { 'kibana.alert.severity': 'critical' },
      });
    });

    it('omits undefined values', () => {
      const result = getSnoozeFieldsToPreserve({
        [ALERT_SNOOZE_EXPIRES_AT]: new Date(Date.now() + 3600).toISOString(),
      });
      expect(result).toEqual({
        [ALERT_SNOOZE_EXPIRES_AT]: expect.any(String),
      });
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('returns empty object when no snooze fields are set', () => {
      expect(getSnoozeFieldsToPreserve({})).toEqual({});
    });
  });
});
