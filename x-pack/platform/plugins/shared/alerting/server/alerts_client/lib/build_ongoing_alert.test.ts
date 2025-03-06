/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildOngoingAlert } from './build_ongoing_alert';
import {
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  SPACE_IDS,
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
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
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_SEVERITY_IMPROVING,
  ALERT_PREVIOUS_ACTION_GROUP,
} from '@kbn/rule-data-utils';
import { alertRule, existingFlattenedNewAlert, existingExpandedNewAlert } from './test_fixtures';

for (const flattened of [true, false]) {
  const existingAlert = flattened ? existingFlattenedNewAlert : existingExpandedNewAlert;

  describe(`buildOngoingAlert for ${flattened ? 'flattened' : 'expanded'} existing alert`, () => {
    test('should return alert document with updated info from legacy alert', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      expect(
        buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
          // @ts-expect-error
          alert: existingAlert,
          legacyAlert,
          rule: alertRule,
          isImproving: true,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_DURATION]: 36000,
        [ALERT_STATUS]: 'active',
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
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated rule data if rule definition has changed', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const updatedRule = {
        ...alertRule,
        [ALERT_RULE_NAME]: 'updated-rule-name',
        [ALERT_RULE_PARAMETERS]: { bar: false },
      };
      expect(
        buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
          // @ts-expect-error
          alert: existingAlert,
          legacyAlert,
          rule: updatedRule,
          isImproving: false,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...updatedRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: false,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated flapping history and maintenance window ids if set', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('error')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });
      legacyAlert.setFlappingHistory([false, false, true, true]);
      legacyAlert.setMaintenanceWindowIds(['maint-xyz']);

      const alert = flattened
        ? {
            ...existingAlert,
            [ALERT_FLAPPING_HISTORY]: [true, false, false, false, true, true],
            [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
          }
        : {
            ...existingAlert,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                flapping_history: [true, false, false, false, true, true],
                maintenance_window_ids: ['maint-1', 'maint-321'],
              },
            },
          };

      expect(
        buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          isImproving: null,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'error',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
        [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-xyz'],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated isImproving', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('error')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const alert = flattened
        ? {
            ...existingAlert,
            [ALERT_SEVERITY_IMPROVING]: true,
          }
        : {
            ...existingAlert,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                severity_improving: true,
              },
            },
          };

      expect(
        buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          isImproving: null,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'error',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_SEVERITY_IMPROVING]: undefined,
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated payload if specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };
      expect(
        buildOngoingAlert<
          { count: number; url: string; 'kibana.alert.nested_field'?: number },
          {},
          {},
          'error' | 'warning',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          isImproving: true,
          payload: {
            count: 2,
            url: `https://url2`,
            'kibana.alert.nested_field': 2,
          },
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated runTimestamp if specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      expect(
        buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
          // @ts-expect-error
          alert: existingAlert,
          legacyAlert,
          rule: alertRule,
          isImproving: false,
          runTimestamp: '2030-12-15T02:44:13.124Z',
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2030-12-15T02:44:13.124Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: false,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_DURATION]: 36000,
        [ALERT_STATUS]: 'active',
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
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated payload if specified but not overwrite any framework fields', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };

      expect(
        buildOngoingAlert<
          {
            count: number;
            url: string;
            [ALERT_ACTION_GROUP]: string;
            'kibana.alert.nested_field'?: number;
          },
          {},
          {},
          'error' | 'warning',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          isImproving: null,
          timestamp: '2023-03-29T12:27:28.159Z',
          payload: {
            count: 2,
            url: `https://url2`,
            [ALERT_ACTION_GROUP]: 'bad action group',
            'kibana.alert.nested_field': 2,
          },
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should merge and de-dupe tags from existing alert, reported payload and rule tags', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            tags: ['old-tag1', '-tags'],
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            tags: ['old-tag1', '-tags'],
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };

      expect(
        buildOngoingAlert<
          {
            count: number;
            url: string;
            [ALERT_ACTION_GROUP]: string;
            'kibana.alert.nested_field'?: number;
            tags?: string[];
          },
          {},
          {},
          'error' | 'warning',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          isImproving: true,
          timestamp: '2023-03-29T12:27:28.159Z',
          payload: {
            count: 2,
            url: `https://url2`,
            [ALERT_ACTION_GROUP]: 'bad action group',
            'kibana.alert.nested_field': 2,
            tags: ['-tags', 'custom-tag2'],
          },
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['-tags', 'custom-tag2', 'old-tag1', 'rule-'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should not update alert document if no payload is specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };

      expect(
        buildOngoingAlert<{ count: number; url: string }, {}, {}, 'error' | 'warning', 'recovered'>(
          {
            // @ts-expect-error
            alert,
            legacyAlert,
            rule: alertRule,
            isImproving: false,
            timestamp: '2023-03-29T12:27:28.159Z',
            kibanaVersion: '8.9.0',
          }
        )
      ).toEqual({
        ...alertRule,
        count: 1,
        url: `https://url1`,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: false,
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              'kibana.alert.nested_field': 3,
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  nested_field: 3,
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should use workflow_status from payload if specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert
        .scheduleActions('warning')
        .replaceState({ start: '2023-03-28T12:27:28.159Z', duration: '36000000' });

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.deeply.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                deeply: { nested_field: 3 },
              },
            },
          };

      expect(
        buildOngoingAlert<
          {
            count: number;
            url: string;
            [ALERT_WORKFLOW_STATUS]: string;
            'kibana.alert.deeply.nested_field'?: number;
          },
          {},
          {},
          'error' | 'warning',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
          isImproving: null,
          payload: {
            count: 2,
            url: `https://url2`,
            [ALERT_WORKFLOW_STATUS]: 'custom_status',
            'kibana.alert.deeply.nested_field': 2,
          },
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.deeply.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
        [ALERT_STATUS]: 'active',
        [ALERT_WORKFLOW_STATUS]: 'custom_status',
        [ALERT_DURATION]: 36000,
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_START]: '2023-03-28T12:27:28.159Z',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  start: '2023-03-28T12:27:28.159Z',
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });
  });
}
