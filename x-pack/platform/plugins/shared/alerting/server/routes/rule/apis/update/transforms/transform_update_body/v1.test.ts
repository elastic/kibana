/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRuleRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/update';
import { transformUpdateBody } from './v1';

describe('transformUpdateBody', () => {
  let baseUpdateBody: UpdateRuleRequestBodyV1<{}>;
  let baseActions: UpdateRuleRequestBodyV1<{}>['actions'];
  let baseSystemActions: UpdateRuleRequestBodyV1<{}>['actions'];
  beforeEach(() => {
    baseUpdateBody = {
      name: 'Test Rule',
      tags: ['tag1', 'tag2'],
      throttle: '1m',
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      notify_when: 'onActionGroupChange' as 'onActionGroupChange',
      alert_delay: { active: 5 },
      flapping: {
        look_back_window: 10,
        status_change_threshold: 5,
      },
      artifacts: {
        dashboards: [{ id: 'dashboard1' }],
        investigation_guide: { blob: 'guide-content' },
      },
      actions: [],
    };
    baseActions = [
      {
        group: 'default',
        id: 'action1',
        params: { key: 'value' },
        frequency: {
          notify_when: 'onThrottleInterval',
          throttle: '1m',
          summary: true,
        },
        alerts_filter: {},
        use_alert_data_for_template: true,
      },
    ];
    baseSystemActions = [
      {
        id: 'systemAction1',
        params: { key: 'value' },
      },
    ];
  });

  it('should transform the update body with all fields populated', () => {
    const result = transformUpdateBody({
      updateBody: baseUpdateBody,
      actions: baseActions,
      systemActions: baseSystemActions,
    });

    expect(result).toEqual({
      name: 'Test Rule',
      tags: ['tag1', 'tag2'],
      throttle: '1m',
      params: { param1: 'value1' },
      schedule: { interval: '1m' },
      notifyWhen: 'onActionGroupChange',
      alertDelay: { active: 5 },
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 5,
      },
      artifacts: {
        dashboards: [{ id: 'dashboard1' }],
        investigation_guide: { blob: 'guide-content' },
      },
      actions: [
        {
          group: 'default',
          id: 'action1',
          params: { key: 'value' },
          frequency: {
            throttle: '1m',
            summary: true,
            notifyWhen: 'onThrottleInterval',
          },
          alertsFilter: {},
          useAlertDataForTemplate: true,
        },
      ],
      systemActions: [
        {
          id: 'systemAction1',
          params: { key: 'value' },
        },
      ],
    });
  });

  it('should handle missing optional fields', () => {
    const result = transformUpdateBody({
      updateBody: {
        ...baseUpdateBody,
        name: 'Test Rule',
        tags: ['tag1'],
        params: { param1: 'value1' },
        schedule: { interval: '1m' },
      },
      actions: [],
      systemActions: [],
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [],
        "alertDelay": Object {
          "active": 5,
        },
        "artifacts": Object {
          "dashboards": Array [
            Object {
              "id": "dashboard1",
            },
          ],
          "investigation_guide": Object {
            "blob": "guide-content",
          },
        },
        "flapping": Object {
          "lookBackWindow": 10,
          "statusChangeThreshold": 5,
        },
        "name": "Test Rule",
        "notifyWhen": "onActionGroupChange",
        "params": Object {
          "param1": "value1",
        },
        "schedule": Object {
          "interval": "1m",
        },
        "systemActions": Array [],
        "tags": Array [
          "tag1",
        ],
        "throttle": "1m",
      }
    `);
  });

  it('should omit flapping when undefined', () => {
    const result = transformUpdateBody({
      updateBody: {
        ...baseUpdateBody,
        name: 'Test Rule',
        tags: ['tag1'],
        params: { param1: 'value1' },
        schedule: { interval: '1m' },
        flapping: undefined,
      },
      actions: [],
      systemActions: [],
    });

    expect(result.flapping).not.toBeDefined();
  });

  it('should handle missing frequency in actions', () => {
    const result = transformUpdateBody({
      updateBody: {
        ...baseUpdateBody,
        name: 'Test Rule',
        tags: ['tag1'],
        params: { param1: 'value1' },
        schedule: { interval: '1m' },
      },
      actions: [
        {
          group: 'default',
          id: 'action1',
          params: { key: 'value' },
        },
      ],
      systemActions: baseSystemActions,
    });

    expect(result.actions).toMatchInlineSnapshot(`
      Array [
        Object {
          "group": "default",
          "id": "action1",
          "params": Object {
            "key": "value",
          },
        },
      ]
    `);
  });
});
