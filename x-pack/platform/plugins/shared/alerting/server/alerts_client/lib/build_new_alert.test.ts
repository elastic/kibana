/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildNewAlert } from './build_new_alert';
import { Alert } from '@kbn/alerts-as-data-utils';
import {
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
} from '@kbn/rule-data-utils';
import { alertRule } from './test_fixtures';

describe('buildNewAlert', () => {
  test('should build alert document with info from legacy alert', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should include start and duration if set', () => {
    const now = Date.now();
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default').replaceState({ start: now, duration: '0' });

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: 0,
      [ALERT_START]: now,
      [ALERT_TIME_RANGE]: { gte: now },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should include flapping history and maintenance window ids if set', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([true, false, false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [true, false, false, false, true, true],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should include alert payload if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        { count: number; url: string; 'kibana.alert.nested_field': number },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: { count: 1, url: `https://url1`, 'kibana.alert.nested_field': 2 },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 1,
      url: `https://url1`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should use runTimestamp if provided', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        runTimestamp: '2030-12-15T02:44:13.124Z',
        timestamp: '2023-03-28T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2030-12-15T02:44:13.124Z',
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should use workflow status from alert payload if set', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        Alert & { count: number; url: string; 'kibana.alert.nested_field': number },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: {
          count: 1,
          url: `https://url1`,
          'kibana.alert.nested_field': 2,
          [ALERT_WORKFLOW_STATUS]: 'custom_workflow',
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 1,
      url: `https://url1`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'custom_workflow',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should overwrite any framework fields included in payload', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        {
          count: number;
          url: string;
          [ALERT_ACTION_GROUP]: string;
          'kibana.alert.nested_field': number;
        },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: {
          count: 1,
          url: `https://url1`,
          [ALERT_ACTION_GROUP]: 'bad action group',
          'kibana.alert.nested_field': 2,
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 1,
      url: `https://url1`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should merge and de-dupe rule tags and any tags from payload', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        {
          count: number;
          url: string;
          [ALERT_ACTION_GROUP]: string;
          'kibana.alert.nested_field': number;
          tags: string[];
        },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: {
          count: 1,
          url: `https://url1`,
          [ALERT_ACTION_GROUP]: 'bad action group',
          'kibana.alert.nested_field': 2,
          tags: ['custom-tag1', '-tags'],
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 1,
      url: `https://url1`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-28T12:27:28.159Z',
      [EVENT_ACTION]: 'open',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'default',
      [ALERT_CONSECUTIVE_MATCHES]: 0,
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_SEVERITY_IMPROVING]: false,
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['custom-tag1', '-tags', 'rule-'],
    });
  });
});
