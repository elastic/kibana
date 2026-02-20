/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../../alert/alert';
import { buildUpdatedRecoveredAlert } from './build_updated_recovered_alert';
import {
  SPACE_IDS,
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_MUTED,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  TAGS,
  TIMESTAMP,
  VERSION,
  ALERT_TIME_RANGE,
  ALERT_END,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_RULE_EXECUTION_UUID,
} from '@kbn/rule-data-utils';
import {
  ALERT_SNOOZE_CONDITION_OPERATOR,
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_SNOOZE_SNAPSHOT,
} from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  alertRule,
  existingFlattenedRecoveredAlert,
  existingExpandedRecoveredAlert,
} from '../test_fixtures';

describe('buildUpdatedRecoveredAlert', () => {
  test('should update already recovered flattened alert document with updated flapping values and timestamp only', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        alert: existingFlattenedRecoveredAlert,
        legacyRawAlert: {
          meta: {
            flapping: true,
            flappingHistory: [false, false, true, true],
            maintenanceWindowIds: ['maint-1', 'maint-321'],
          },
          state: {
            start: '3023-03-27T12:27:28.159Z',
          },
        },
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'close',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'recovered',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-27T12:27:28.159Z',
      [ALERT_END]: '2023-03-30T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-27T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
      [ALERT_FLAPPING]: true,
      [ALERT_MUTED]: false,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_PREVIOUS_ACTION_GROUP]: 'recovered',
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-x'],
      [ALERT_STATUS]: 'recovered',
      // @ts-expect-error upgrade typescript v5.1.6
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.8.1',
      [TAGS]: ['rule-', '-tags'],
      [ALERT_CONSECUTIVE_MATCHES]: 0,
    });
  });

  test('should update with runTimestamp if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        alert: existingFlattenedRecoveredAlert,
        runTimestamp: '2030-12-15T02:44:13.124Z',
        legacyRawAlert: {
          meta: {
            flapping: true,
            flappingHistory: [false, false, true, true],
            maintenanceWindowIds: ['maint-1', 'maint-321'],
          },
          state: {
            start: '3023-03-27T12:27:28.159Z',
          },
        },
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2030-12-15T02:44:13.124Z',
      [EVENT_ACTION]: 'close',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'recovered',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-27T12:27:28.159Z',
      [ALERT_END]: '2023-03-30T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-27T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
      [ALERT_FLAPPING]: true,
      [ALERT_MUTED]: false,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_PREVIOUS_ACTION_GROUP]: 'recovered',
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-x'],
      [ALERT_STATUS]: 'recovered',
      // @ts-expect-error upgrade typescript v5.1.6
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.8.1',
      [TAGS]: ['rule-', '-tags'],
      [ALERT_CONSECUTIVE_MATCHES]: 0,
    });
  });

  test('should update already recovered expanded alert document with updated flapping values and timestamp only', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        // @ts-expect-error
        alert: existingExpandedRecoveredAlert,
        legacyRawAlert: {
          meta: {
            flapping: true,
            flappingHistory: [false, false, true, true],
            maintenanceWindowIds: ['maint-1', 'maint-321'],
          },
          state: {
            start: '3023-03-27T12:27:28.159Z',
          },
        },
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      })
    ).toEqual({
      event: {
        action: 'close',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'recovered',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-x'],
          muted: false,
          rule: {
            category: 'My test rule',
            consumer: 'bar',
            name: 'rule-name',
            parameters: {
              bar: true,
            },
            producer: 'alerts',
            revision: 0,
            rule_type_id: 'test.rule-type',
            tags: ['rule-', '-tags'],
            uuid: '1',
          },
          start: '2023-03-28T12:27:28.159Z',
          time_range: {
            gte: '2023-03-27T12:27:28.159Z',
            lte: '2023-03-30T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          consecutive_matches: 0,
        },
        space_ids: ['default'],
        version: '8.8.1',
      },
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      [ALERT_FLAPPING]: true,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_PREVIOUS_ACTION_GROUP]: 'recovered',
      [ALERT_STATUS]: 'recovered',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  describe('snooze TTL expiry during recovery phase', () => {
    const baseRawAlert = {
      meta: { flapping: false, flappingHistory: [] },
      state: {},
    };

    test('should clear snooze fields when TTL expires while alert is in recovered state', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago

      const result = buildUpdatedRecoveredAlert<{}>({
        alert: {
          ...existingFlattenedRecoveredAlert,
          [ALERT_MUTED]: true,
          [ALERT_SNOOZE_EXPIRES_AT]: expiredAt,
        } as unknown as Alert,
        legacyRawAlert: baseRawAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      });

      expect((result as Record<string, unknown>)[ALERT_MUTED]).toBe(false);
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_EXPIRES_AT]).toBeUndefined();
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_CONDITIONS]).toBeUndefined();
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_CONDITION_OPERATOR]).toBeUndefined();
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_SNAPSHOT]).toBeUndefined();
    });

    test('should NOT clear snooze fields when TTL has not yet expired', () => {
      const futureAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

      const result = buildUpdatedRecoveredAlert<{}>({
        alert: {
          ...existingFlattenedRecoveredAlert,
          [ALERT_MUTED]: true,
          [ALERT_SNOOZE_EXPIRES_AT]: futureAt,
        } as unknown as Alert,
        legacyRawAlert: baseRawAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      });

      expect((result as Record<string, unknown>)[ALERT_MUTED]).toBe(true);
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_EXPIRES_AT]).toBe(futureAt);
    });

    test('should NOT clear condition-only snooze fields (no expires_at) during recovery phase', () => {
      // Condition-only snoozes have no TTL — they can only be evaluated when the alert
      // re-activates and in-memory alert data is available to evaluate against.
      const conditions = [
        { type: 'severity_equals', field: 'kibana.alert.severity', value: 'medium' },
      ];

      const result = buildUpdatedRecoveredAlert<{}>({
        alert: {
          ...existingFlattenedRecoveredAlert,
          [ALERT_MUTED]: true,
          [ALERT_SNOOZE_CONDITIONS]: conditions,
          [ALERT_SNOOZE_CONDITION_OPERATOR]: 'any',
        } as unknown as Alert,
        legacyRawAlert: baseRawAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      });

      expect((result as Record<string, unknown>)[ALERT_MUTED]).toBe(true);
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_CONDITIONS]).toEqual(conditions);
      expect((result as Record<string, unknown>)[ALERT_SNOOZE_CONDITION_OPERATOR]).toBe('any');
    });
  });
});
