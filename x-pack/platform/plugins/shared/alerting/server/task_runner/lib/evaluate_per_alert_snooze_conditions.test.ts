/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { evaluatePerAlertSnoozeConditions } from './evaluate_per_alert_snooze_conditions';
import type { RawRuleSnoozedInstance } from '../../saved_objects/schemas/raw_rule';

const makeInstance = (overrides: Partial<RawRuleSnoozedInstance> = {}): RawRuleSnoozedInstance => ({
  instanceId: 'alert-1',
  snoozedAt: '2026-01-01T00:00:00.000Z',
  snoozedBy: 'user',
  ...overrides,
});

const buildMap = (
  entries: Array<[string, Record<string, unknown>]>
): Map<string, Record<string, unknown>> => new Map(entries);

describe('evaluatePerAlertSnoozeConditions', () => {
  describe('no conditions on instance', () => {
    it('keeps instance snoozed when conditions array is absent', () => {
      const instance = makeInstance({ instanceId: 'alert-1' });
      const alertAsData = { [ALERT_SEVERITY]: 'high' };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('keeps instance snoozed when conditions array is empty', () => {
      const instance = makeInstance({ instanceId: 'alert-1', conditions: [] });
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', { [ALERT_SEVERITY]: 'high' }]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('alert not in field map', () => {
    it('keeps instance snoozed when alert has no alert-as-data (not in map)', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const result = evaluatePerAlertSnoozeConditions([instance], new Map());
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('field_change condition', () => {
    it('unsnoozes when the tracked field changed from the snapshot value', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'field_change', field: 'kibana.alert.severity' }],
        snoozeSnapshot: { 'kibana.alert.severity': 'low' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
      expect(result.conditionExpiredInstances[0].instanceId).toBe('alert-1');
    });

    it('keeps instance snoozed when the tracked field is unchanged', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'field_change', field: 'kibana.alert.severity' }],
        snoozeSnapshot: { 'kibana.alert.severity': 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('keeps instance snoozed when the snapshot does not contain the tracked field', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'field_change', field: 'kibana.alert.severity' }],
        snoozeSnapshot: {},
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('keeps instance snoozed when snoozeSnapshot is undefined', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'field_change', field: 'kibana.alert.severity' }],
        snoozeSnapshot: undefined,
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('severity_change condition', () => {
    it('unsnoozes when severity changed from the snapshot value', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'low' },
      });
      const alertAsData = { kibana: { alert: { severity: 'critical' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
    });

    it('keeps instance snoozed when severity is unchanged', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('keeps instance snoozed when snapshot has no severity field', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: {},
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('severity_equals condition', () => {
    it('unsnoozes when current severity matches the target value', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_equals', value: 'critical' }],
        snoozeSnapshot: {},
      });
      const alertAsData = { kibana: { alert: { severity: 'critical' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
    });

    it('keeps instance snoozed when current severity does not match the target', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_equals', value: 'critical' }],
        snoozeSnapshot: {},
      });
      const alertAsData = { kibana: { alert: { severity: 'low' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('keeps instance snoozed when current severity is absent', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_equals', value: 'critical' }],
        snoozeSnapshot: {},
      });
      const alertAsData = {};
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('conditionOperator: any (default)', () => {
    it('unsnoozes when any condition is met (first condition matches)', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditionOperator: 'any',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'kibana.alert.severity' },
        ],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'critical' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
    });

    it('unsnoozes when any condition is met (second condition matches)', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditionOperator: 'any',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'kibana.alert.severity' },
        ],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'low' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
    });

    it('keeps instance snoozed when no conditions are met', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditionOperator: 'any',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'kibana.alert.severity' },
        ],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('unsnoozes with default operator (undefined) when any condition is met', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'kibana.alert.severity' },
        ],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'critical' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
    });
  });

  describe('conditionOperator: all', () => {
    it('unsnoozes only when all conditions are met', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditionOperator: 'all',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'kibana.alert.severity' },
        ],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'low' },
      });
      const alertAsData = { kibana: { alert: { severity: 'critical' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
    });

    it('keeps instance snoozed when only one of two conditions is met', () => {
      // severity_equals 'critical' → true (current IS critical)
      // field_change 'some.other.field' → false (field unchanged in snapshot)
      // With 'all': one false → stay snoozed
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditionOperator: 'all',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'some.other.field' },
        ],
        snoozeSnapshot: { 'some.other.field': 'unchanged' },
      });
      const alertAsData = {
        kibana: { alert: { severity: 'critical' } },
        some: { other: { field: 'unchanged' } },
      };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });

    it('keeps instance snoozed when no conditions are met', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditionOperator: 'all',
        conditions: [
          { type: 'severity_equals', value: 'critical' },
          { type: 'field_change', field: 'kibana.alert.severity' },
        ],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('multiple instances', () => {
    it('evaluates each instance independently', () => {
      const instanceA = makeInstance({
        instanceId: 'alert-a',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'low' },
      });
      const instanceB = makeInstance({
        instanceId: 'alert-b',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const result = evaluatePerAlertSnoozeConditions(
        [instanceA, instanceB],
        buildMap([
          ['alert-a', { kibana: { alert: { severity: 'critical' } } }],
          ['alert-b', { kibana: { alert: { severity: 'high' } } }],
        ])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
      expect(result.conditionExpiredInstances[0].instanceId).toBe('alert-a');
    });
  });

  describe('alert recovered and re-fired while snoozed', () => {
    it('evaluates conditions on the re-fired alert using its current field values', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'low' },
      });
      // Alert recovered and re-fired with a different severity
      const alertAsData = { kibana: { alert: { severity: 'critical' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(1);
      expect(result.conditionExpiredInstances[0].instanceId).toBe('alert-1');
    });

    it('keeps instance snoozed when re-fired alert severity is the same as snapshot', () => {
      const instance = makeInstance({
        instanceId: 'alert-1',
        conditions: [{ type: 'severity_change' }],
        snoozeSnapshot: { [ALERT_SEVERITY]: 'high' },
      });
      const alertAsData = { kibana: { alert: { severity: 'high' } } };
      const result = evaluatePerAlertSnoozeConditions(
        [instance],
        buildMap([['alert-1', alertAsData]])
      );
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });

  describe('empty inputs', () => {
    it('returns empty result for empty activeSnoozedInstances', () => {
      const result = evaluatePerAlertSnoozeConditions([], new Map());
      expect(result.conditionExpiredInstances).toHaveLength(0);
    });
  });
});
