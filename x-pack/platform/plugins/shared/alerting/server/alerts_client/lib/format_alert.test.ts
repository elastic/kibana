/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  expandFlattenedAlert,
  compactObject,
  removeUnflattenedFieldsFromAlert,
} from './format_alert';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TAGS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';

describe('expandFlattenedAlert', () => {
  test('should correctly expand flattened alert', () => {
    expect(
      expandFlattenedAlert({
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'active',
        [EVENT_KIND]: 'signal',
        [ALERT_ACTION_GROUP]: 'warning',
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_INSTANCE_ID]: 'alert-A',
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_STATUS]: 'active',
        [ALERT_UUID]: 'abcdefg',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: '36000000',
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        [ALERT_RULE_CATEGORY]: 'My test rule',
        [ALERT_RULE_CONSUMER]: 'bar',
        [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
        [ALERT_RULE_NAME]: 'rule-name',
        [ALERT_RULE_PARAMETERS]: { bar: true },
        [ALERT_RULE_PRODUCER]: 'alerts',
        [ALERT_RULE_REVISION]: 0,
        [ALERT_RULE_TYPE_ID]: 'test.rule-type',
        [ALERT_RULE_TAGS]: ['rule-', '-tags'],
        [ALERT_RULE_UUID]: '1',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          rule: {
            category: 'My test rule',
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
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
          status: 'active',
          time_range: {
            gte: '2023-03-28T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
    });
  });
});

describe('removeUnflattenedFieldsFromAlert', () => {
  test('should correctly remove duplicate data from alert', () => {
    expect(
      removeUnflattenedFieldsFromAlert(
        {
          '@timestamp': '2023-03-29T12:27:28.159Z',
          event: {
            action: 'active',
            kind: 'signal',
          },
          kibana: {
            alert: {
              action_group: 'warning',
              duration: {
                us: '36000000',
              },
              evaluation: {
                conditions: 'matched query',
                value: '123',
              },
              flapping: false,
              flapping_history: [],
              instance: {
                id: 'alert-A',
              },
              maintenance_window_ids: [],
              reason: 'because i said so',
              rule: {
                category: 'My test rule',
                consumer: 'bar',
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
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
              status: 'active',
              time_range: {
                gte: '2023-03-28T12:27:28.159Z',
              },
              title: 'this is an alert',
              uuid: 'abcdefg',
              url: 'https://alert.url/abcdefg',
              workflow_status: 'open',
            },
            space_ids: ['default'],
            version: '8.9.0',
          },
          tags: ['rule-', '-tags'],
        },
        {
          [TIMESTAMP]: '2023-03-30T12:27:28.159Z',
          [EVENT_ACTION]: 'active',
          [ALERT_ACTION_GROUP]: 'warning',
          [ALERT_FLAPPING]: false,
          [ALERT_FLAPPING_HISTORY]: [],
          [ALERT_MAINTENANCE_WINDOW_IDS]: [],
          [ALERT_DURATION]: '36000000',
          [SPACE_IDS]: ['default'],
          [VERSION]: '8.9.0',
          [TAGS]: ['rule-', '-tags'],
          [ALERT_RULE_CATEGORY]: 'My test rule',
          [ALERT_RULE_CONSUMER]: 'bar',
          [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
          [ALERT_RULE_NAME]: 'rule-name',
          [ALERT_RULE_PARAMETERS]: { bar: true },
          [ALERT_RULE_PRODUCER]: 'alerts',
          [ALERT_RULE_REVISION]: 0,
          [ALERT_RULE_TYPE_ID]: 'test.rule-type',
          [ALERT_RULE_TAGS]: ['rule-', '-tags'],
          [ALERT_RULE_UUID]: '1',
          [ALERT_URL]: 'https://abc',
          [ALERT_REASON]: 'because',
          'kibana.alert.evaluation.conditions': 'condition',
        }
      )
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      event: {
        kind: 'signal',
      },
      kibana: {
        alert: {
          evaluation: {
            value: '123',
          },
          instance: {
            id: 'alert-A',
          },
          start: '2023-03-28T12:27:28.159Z',
          status: 'active',
          time_range: {
            gte: '2023-03-28T12:27:28.159Z',
          },
          title: 'this is an alert',
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
      },
      tags: ['rule-', '-tags'],
    });
  });
});

describe('compactObject', () => {
  test('should compact object as expected', () => {
    expect(compactObject({ kibana: { alert: { rule: { execution: {} } }, rule: {} } })).toEqual({});
    expect(
      compactObject({
        kibana: {
          rule: 34,
          testField: [],
          alert: { rule: { execution: {}, nested_field: ['a', 'b'] } },
        },
      })
    ).toEqual({
      kibana: { rule: 34, testField: [], alert: { rule: { nested_field: ['a', 'b'] } } },
    });
  });
  expect(compactObject({ 'kibana.alert.rule.execution': {} })).toEqual({});
  expect(
    compactObject({ 'kibana.alert.rule.execution': {}, 'kibana.alert.nested_field': ['a', 'b'] })
  ).toEqual({ 'kibana.alert.nested_field': ['a', 'b'] });

  test('should not filter out the fileds with primitive values', () => {
    expect(
      compactObject({
        'kibana.alert.rule.execution': 1,
        'kibana.alert.rule.zero': 0,
        'kibana.alert.bool_field': false,
        'kibana.alert.null_field': null,
      })
    ).toEqual({
      'kibana.alert.rule.execution': 1,
      'kibana.alert.rule.zero': 0,
      'kibana.alert.bool_field': false,
      'kibana.alert.null_field': null,
    });
  });
});
