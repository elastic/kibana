/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../../alert/alert';
import { buildGraduatedAlert } from './build_graduated_alert';
import {
  ALERT_ACTION_GROUP,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_MAINTENANCE_WINDOW_NAMES,
  ALERT_MUTED,
  ALERT_PENDING_RECOVERED_COUNT,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_SEVERITY_IMPROVING,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TAGS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import {
  alertRule,
  existingExpandedDelayedAlert,
  existingFlattenedDelayedAlert,
} from '../test_fixtures';

for (const flattened of [true, false]) {
  const existingDelayed = (
    flattened ? existingFlattenedDelayedAlert : existingExpandedDelayedAlert
  ) as Record<string, unknown> & { kibana?: { alert?: Record<string, unknown> } };

  describe(`buildGraduatedAlert for ${
    flattened ? 'flattened' : 'expanded'
  } delayed predecessor`, () => {
    test('should build active document overriding predecessor status with EVENT_ACTION="open"', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg', activeCount: 2 },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const built = buildGraduatedAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
        // @ts-expect-error
        alert: existingDelayed,
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      });

      expect(built).toMatchObject({
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'open',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 2,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: false,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_MAINTENANCE_WINDOW_NAMES]: [],
        [ALERT_PENDING_RECOVERED_COUNT]: 0,
        [ALERT_DURATION]: 36000,
        [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [ALERT_WORKFLOW_STATUS]: 'open',
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
              [ALERT_MUTED]: false,
            }
          : {}),
      });
    });

    test('should not include ALERT_PREVIOUS_ACTION_GROUP because there is no prior active state', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('warning');

      const built = buildGraduatedAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
        // @ts-expect-error
        alert: existingDelayed,
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      });

      expect(built).not.toHaveProperty(ALERT_PREVIOUS_ACTION_GROUP);
    });

    test('should preserve rule type fields from delayed predecessor when no fresh payload (flap-hold reactivation)', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default');

      const predecessor = flattened
        ? {
            ...existingDelayed,
            'kibana.alert.reason': 'value-was-X',
          }
        : {
            ...existingDelayed,
            kibana: {
              ...existingDelayed.kibana,
              alert: { ...existingDelayed.kibana?.alert, reason: 'value-was-X' },
            },
          };

      const built = buildGraduatedAlert<
        { 'kibana.alert.reason': string },
        {},
        {},
        'default',
        'recovered'
      >({
        // @ts-expect-error
        alert: predecessor,
        legacyAlert,
        rule: alertRule,
        // No payload — simulating flap-hold reactivation
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      });

      if (flattened) {
        expect(built).toMatchObject({
          'kibana.alert.reason': 'value-was-X',
        });
      } else {
        expect(built).toMatchObject({
          kibana: {
            alert: {
              reason: 'value-was-X',
            },
          },
        });
      }
      expect(built[ALERT_STATUS]).toBe(ALERT_STATUS_ACTIVE);
      expect(built[EVENT_ACTION]).toBe('open');
    });

    test('should let fresh payload win over delayed predecessor fields when executor still reports', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default');

      const predecessor = flattened
        ? { ...existingDelayed, 'kibana.alert.reason': 'old-value' }
        : {
            ...existingDelayed,
            kibana: {
              ...existingDelayed.kibana,
              alert: { ...existingDelayed.kibana?.alert, reason: 'old-value' },
            },
          };

      const built = buildGraduatedAlert<
        { 'kibana.alert.reason': string },
        {},
        {},
        'default',
        'recovered'
      >({
        // @ts-expect-error
        alert: predecessor,
        legacyAlert,
        rule: alertRule,
        payload: { 'kibana.alert.reason': 'new-value' },
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      });

      // After merge the new payload appears as a flat key and the old
      // nested predecessor field is omitted (mirrors buildOngoingAlert).
      expect(built['kibana.alert.reason']).toBe('new-value');
      if (!flattened) {
        // @ts-expect-error
        expect(built.kibana?.alert?.reason).toBeUndefined();
      }
    });

    test(`should set kibana.space_ids to '*' if dangerouslyCreateAlertsInAllSpaces=true`, () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default');

      const built = buildGraduatedAlert<{}, {}, {}, 'default', 'recovered'>({
        // @ts-expect-error
        alert: existingDelayed,
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
        dangerouslyCreateAlertsInAllSpaces: true,
      });

      expect(built[SPACE_IDS]).toEqual(['*']);
    });

    test('should default ALERT_WORKFLOW_STATUS to "open" when not present on predecessor', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default');

      const predecessor = flattened
        ? (() => {
            const copy = { ...existingDelayed };
            delete copy[ALERT_WORKFLOW_STATUS];
            return copy;
          })()
        : (() => {
            const innerAlert = { ...existingDelayed.kibana?.alert };
            delete innerAlert.workflow_status;
            const copy = {
              ...existingDelayed,
              kibana: { ...existingDelayed.kibana, alert: innerAlert },
            };
            return copy;
          })();

      const built = buildGraduatedAlert<{}, {}, {}, 'default', 'recovered'>({
        // @ts-expect-error
        alert: predecessor,
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      });

      expect(built[ALERT_WORKFLOW_STATUS]).toBe('open');
    });
  });
}
