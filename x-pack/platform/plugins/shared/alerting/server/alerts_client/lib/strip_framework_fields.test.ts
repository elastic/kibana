/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stripFrameworkFields } from './strip_framework_fields';

describe('stripFrameworkFields', () => {
  test('should return empty object if payload is undefined', () => {
    expect(stripFrameworkFields()).toEqual({});
  });

  test('should do nothing if payload has no framework fields', () => {
    const payload = { field1: 'test', kibana: { alert: { not_a_framework_field: 2 } } };
    expect(stripFrameworkFields(payload)).toEqual(payload);
  });

  test('should do nothing if flattened payload has no framework fields', () => {
    const payload = { field1: 'test', 'kibana.alert.not_a_framework_field': 2 };
    expect(stripFrameworkFields(payload)).toEqual(payload);
  });

  test(`should allow fields from the allowlist`, () => {
    const payload = {
      field1: 'test',
      kibana: {
        alert: { not_a_framework_field: 2, reason: 'because i said so', workflow_status: 'custom' },
      },
      tags: ['taggity-tag'],
    };
    expect(stripFrameworkFields(payload)).toEqual(payload);
  });

  test(`should allow fields from the allowlist in flattened payload`, () => {
    const payload = {
      field1: 'test',
      'kibana.alert.not_a_framework_field': 2,
      'kibana.alert.reason': 'because i said so',
      'kibana.alert.workflow_status': 'custom',
      tags: ['taggity-tag'],
    };
    expect(stripFrameworkFields(payload)).toEqual(payload);
  });

  test(`should strip fields that the framework controls`, () => {
    const payload = {
      field1: 'test',
      field2: [],
      kibana: {
        alert: {
          action_group: 'invalid action group',
          not_a_framework_field1: 2,
          not_a_framework_field2: [],
          not_a_framework_field3: {
            abc: 'xyz',
          },
          instance: { id: 'A' },
          duration: {
            us: '23543543534',
          },
          case_ids: ['abcdefg'],
          start: 'datestring',
          status: 'bad',
          end: 'datestring',
          flapping: true,
          flapping_history: [true],
          maintenance_window_ids: ['xyz'],
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
          uuid: 'uuid',
        },
      },
    };
    expect(stripFrameworkFields(payload)).toEqual({
      field1: 'test',
      field2: [],
      kibana: {
        alert: {
          // lodash omit will remove the value for kibana.alert.duration.us but
          // keep the empty duration object. this doesn't affect the final alert document
          duration: {},
          // lodash omit will remove the value for kibana.alert.instance.id but
          // keep the empty instance object. this doesn't affect the final alert document
          instance: {},
          not_a_framework_field1: 2,
          not_a_framework_field2: [],
          not_a_framework_field3: {
            abc: 'xyz',
          },
          // lodash omit will remove the value for kibana.alert.rule.execution.uuid but
          // keep the empty rule.execution object. this doesn't affect the final alert document
          rule: {
            execution: {},
          },
        },
      },
    });
  });

  test(`should strip flattened fields that the framework controls`, () => {
    const payload = {
      field1: 'test',
      field2: [],
      'kibana.alert.action_group': 'invalid action group',
      'kibana.alert.not_a_framework_field1': 2,
      'kibana.alert.not_a_framework_field2': [],
      'kibana.alert.not_a_framework_field3.abc': 'xyz',
      'kibana.alert.instance.id': 'A',
      'kibana.alert.duration.us': '23543543534',
      'kibana.alert.case_ids': ['abcdefg'],
      'kibana.alert.start': 'datestring',
      'kibana.alert.status': 'bad',
      'kibana.alert.end': 'datestring',
      'kibana.alert.flapping': true,
      'kibana.alert.flapping_history': [true],
      'kibana.alert.maintenance_window_ids': ['xyz'],
      'kibana.alert.rule.category': 'My test rule',
      'kibana.alert.rule.consumer': 'bar',
      'kibana.alert.rule.execution.uuid': '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      'kibana.alert.rule.name': 'rule-name',
      'kibana.alert.rule.parameters': {
        bar: true,
      },
      'kibana.alert.rule.producer': 'alerts',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.rule_type_id': 'test.rule-type',
      'kibana.alert.rule.tags': ['rule-', '-tags'],
      'kibana.alert.rule.uuid': '1',
      'kibana.alert.uuid': 'uuid',
    };
    expect(stripFrameworkFields(payload)).toEqual({
      field1: 'test',
      field2: [],
      'kibana.alert.not_a_framework_field1': 2,
      'kibana.alert.not_a_framework_field2': [],
      'kibana.alert.not_a_framework_field3.abc': 'xyz',
    });
  });
});
