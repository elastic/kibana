/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleDomain } from '../types';
import { transformRuleDomainToRuleAttributes } from './transform_rule_domain_to_rule_attributes';

describe('transformRuleDomainToRuleAttributes', () => {
  const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');

  const defaultAction = {
    id: '1',
    uuid: 'test-uuid',
    group: 'default',
    actionTypeId: 'test',
    params: {},
  };

  const artifacts = {
    dashboards: [
      {
        id: 'dashboard-1',
      },
      {
        id: 'dashboard-2',
      },
    ],
  };

  const rule: RuleDomain<{}> = {
    id: 'test',
    enabled: false,
    name: 'my rule name',
    tags: ['foo'],
    alertTypeId: 'myType',
    consumer: 'myApp',
    schedule: { interval: '1m' },
    actions: [defaultAction],
    artifacts,
    params: {},
    mapped_params: {},
    createdBy: 'user',
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    legacyId: 'legacyId',
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    scheduledTaskId: 'task-123',
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending' as const,
    },
    throttle: null,
    notifyWhen: null,
    revision: 0,
    updatedBy: 'user',
    apiKey: MOCK_API_KEY,
    apiKeyOwner: 'user',
    flapping: {
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    },
  };

  test('should preserve lastEnabledAt when present', () => {
    const result = transformRuleDomainToRuleAttributes({
      rule: { ...rule, lastEnabledAt: new Date('2024-01-15T10:00:00.000Z') },
      actionsWithRefs: [
        {
          group: 'default',
          actionRef: 'action_0',
          actionTypeId: 'test',
          uuid: 'test-uuid',
          params: {},
        },
      ],
      artifactsWithRefs: {
        dashboards: [{ refId: 'dashboard_0' }],
      },
      params: {
        legacyId: 'test',
        paramsWithRefs: {},
      },
    });

    expect(result.lastEnabledAt).toBe('2024-01-15T10:00:00.000Z');
  });

  test('should not include lastEnabledAt when absent', () => {
    const result = transformRuleDomainToRuleAttributes({
      rule,
      actionsWithRefs: [
        {
          group: 'default',
          actionRef: 'action_0',
          actionTypeId: 'test',
          uuid: 'test-uuid',
          params: {},
        },
      ],
      artifactsWithRefs: {
        dashboards: [{ refId: 'dashboard_0' }],
      },
      params: {
        legacyId: 'test',
        paramsWithRefs: {},
      },
    });

    expect(result).not.toHaveProperty('lastEnabledAt');
  });

  test('should transform rule domain to rule attribute', () => {
    const result = transformRuleDomainToRuleAttributes({
      rule,
      actionsWithRefs: [
        {
          group: 'default',
          actionRef: 'action_0',
          actionTypeId: 'test',
          uuid: 'test-uuid',
          params: {},
        },
      ],
      artifactsWithRefs: {
        dashboards: [
          {
            refId: 'dashboard_0',
          },
        ],
      },
      params: {
        legacyId: 'test',
        paramsWithRefs: {},
      },
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {},
            "uuid": "test-uuid",
          },
        ],
        "alertTypeId": "myType",
        "apiKey": "MTIzOmFiYw==",
        "apiKeyOwner": "user",
        "artifacts": Object {
          "dashboards": Array [
            Object {
              "refId": "dashboard_0",
            },
          ],
        },
        "consumer": "myApp",
        "createdAt": "2019-02-12T21:01:22.479Z",
        "createdBy": "user",
        "enabled": false,
        "executionStatus": Object {
          "lastExecutionDate": "2019-02-12T21:01:22.479Z",
          "status": "pending",
        },
        "flapping": Object {
          "lookBackWindow": 20,
          "statusChangeThreshold": 20,
        },
        "legacyId": "test",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "my rule name",
        "notifyWhen": null,
        "params": Object {},
        "revision": 0,
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "snoozeSchedule": Array [],
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "user",
      }
    `);
  });

  test('should preserve snoozedInstances alongside mutedInstanceIds', () => {
    const snoozedInstances = [
      {
        instanceId: 'alert-1',
        expiresAt: '2025-01-01T00:00:00.000Z',
        conditions: [
          { type: 'field_change' as const, field: 'kibana.alert.status' },
          { type: 'severity_change' as const },
        ],
        conditionOperator: 'all' as const,
        snoozeSnapshot: {
          'kibana.alert.status': 'active',
        },
        snoozedAt: '2024-12-31T00:00:00.000Z',
        snoozedBy: 'elastic',
      },
    ];

    const result = transformRuleDomainToRuleAttributes({
      rule: {
        ...rule,
        mutedInstanceIds: ['muted-instance-1'],
        snoozedInstances,
      },
      actionsWithRefs: [
        {
          group: 'default',
          actionRef: 'action_0',
          actionTypeId: 'test',
          uuid: 'test-uuid',
          params: {},
        },
      ],
      artifactsWithRefs: {
        dashboards: [{ refId: 'dashboard_0' }],
      },
      params: {
        legacyId: 'test',
        paramsWithRefs: {},
      },
    });

    expect(result.mutedInstanceIds).toEqual(['muted-instance-1']);
    expect(result.snoozedInstances).toEqual(snoozedInstances);
  });
});
