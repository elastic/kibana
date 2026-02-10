/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutedAlertInstance } from '@kbn/alerting-types';
import { evaluateMuteConditions } from './evaluate_mute_conditions';

const BASE_ENTRY: MutedAlertInstance = {
  alertInstanceId: 'alert-1',
  mutedAt: '2025-01-01T00:00:00.000Z',
};

describe('evaluateMuteConditions', () => {
  describe('time expiry', () => {
    it('should unmute when expiresAt is in the past', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
      };
      const result = evaluateMuteConditions(entry, {});
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain('Time expiry reached');
    });

    it('should NOT unmute when expiresAt is in the future', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(), // 1 hour from now
      };
      const result = evaluateMuteConditions(entry, {});
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('severity_change', () => {
    it('should unmute when severity has changed from snapshot', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'critical' });
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain("changed from 'medium' to 'critical'");
    });

    it('should NOT unmute when severity is unchanged', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'medium' });
      expect(result.shouldUnmute).toBe(false);
    });

    it('should NOT unmute when snapshotValue is missing', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [{ type: 'severity_change', field: 'kibana.alert.severity' }],
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'critical' });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('severity_equals', () => {
    it('should unmute when severity matches target value', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [
          { type: 'severity_equals', field: 'kibana.alert.severity', value: 'critical' },
        ],
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'critical' });
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain("reached target value 'critical'");
    });

    it('should NOT unmute when severity does not match target', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [
          { type: 'severity_equals', field: 'kibana.alert.severity', value: 'critical' },
        ],
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'medium' });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('field_change', () => {
    it('should unmute when an arbitrary field has changed', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [
          { type: 'field_change', field: 'host.name', snapshotValue: 'server-a' },
        ],
      };
      const result = evaluateMuteConditions(entry, { 'host.name': 'server-b' });
      expect(result.shouldUnmute).toBe(true);
    });

    it('should NOT unmute when field is unchanged', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        conditions: [
          { type: 'field_change', field: 'host.name', snapshotValue: 'server-a' },
        ],
      };
      const result = evaluateMuteConditions(entry, { 'host.name': 'server-a' });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('compound conditions -- conditionOperator: any (OR)', () => {
    it('should unmute if time is expired even when severity is unchanged', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
        conditionOperator: 'any',
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'medium' });
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain('Time expiry reached');
    });

    it('should unmute if severity changed even when time is not expired', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
        conditionOperator: 'any',
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'high' });
      expect(result.shouldUnmute).toBe(true);
      expect(result.reason).toContain("changed from 'medium' to 'high'");
    });

    it('should NOT unmute when neither time nor severity conditions are met', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
        conditionOperator: 'any',
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'medium' });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('compound conditions -- conditionOperator: all (AND)', () => {
    it('should unmute only when ALL conditions are met', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
        conditionOperator: 'all',
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'critical' });
      expect(result.shouldUnmute).toBe(true);
    });

    it('should NOT unmute when only time is expired but severity is unchanged', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
        conditionOperator: 'all',
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'medium' });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('no conditions (indefinite mute)', () => {
    it('should NOT unmute when there are no conditions and no expiry', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
      };
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'critical' });
      expect(result.shouldUnmute).toBe(false);
    });
  });

  describe('defaults', () => {
    it('should default to conditionOperator: any when not specified', () => {
      const entry: MutedAlertInstance = {
        ...BASE_ENTRY,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        conditions: [
          { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
        ],
        // conditionOperator is undefined -- defaults to 'any'
      };
      // Time expired but severity unchanged -- with 'any', should unmute
      const result = evaluateMuteConditions(entry, { 'kibana.alert.severity': 'medium' });
      expect(result.shouldUnmute).toBe(true);
    });
  });
});
