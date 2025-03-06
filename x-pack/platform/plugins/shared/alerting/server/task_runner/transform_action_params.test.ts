/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformActionParams, transformSummaryActionParams } from './transform_action_params';
import {
  actionsMock,
  renderActionParameterTemplatesDefault,
} from '@kbn/actions-plugin/server/mocks';
import { SanitizedRule } from '../types';
import { mockAAD } from './fixtures';

const actionsPlugin = actionsMock.createStart();
const actionTypeId = 'test-actionTypeId';

beforeEach(() => {
  jest.resetAllMocks();
  actionsPlugin.renderActionParameterTemplates.mockImplementation(
    renderActionParameterTemplatesDefault
  );
});

describe('transformActionParams', () => {
  test('skips non string parameters', () => {
    const actionParams = {
      boolean: true,
      number: 1,
      empty1: null,
      empty2: undefined,
      date: '2019-02-12T21:01:22.479Z',
      message: 'Value "{{rule.params.foo}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      context: {},
      state: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {
        foo: 'test',
      },
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "boolean": true,
          "date": "2019-02-12T21:01:22.479Z",
          "empty1": null,
          "empty2": undefined,
          "message": "Value \\"test\\" exists",
          "number": 1,
        }
    `);
  });

  test('missing parameters get emptied out', () => {
    const actionParams = {
      message1: '{{context.value}}',
      message2: 'This message "{{context.value2}}" is missing',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      context: {},
      state: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message1": "",
          "message2": "This message \\"\\" is missing",
        }
    `);
  });

  test('context parameters are passed to templates', () => {
    const actionParams = {
      message: 'Value "{{context.foo}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: { foo: 'fooVal' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"fooVal\\" exists",
        }
    `);
  });

  test('state parameters are passed to templates', () => {
    const actionParams = {
      message: 'Value "{{state.bar}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: { bar: 'barVal' },
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"barVal\\" exists",
        }
    `);
  });

  test('alertId is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertId}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"1\\" exists",
          }
      `);
  });

  test('alertName is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertName}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"alert-name\\" exists",
          }
      `);
  });

  test('tags is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{tags}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"tag-A,tag-B\\" exists",
          }
      `);
  });

  test('undefined tags is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{tags}}" is undefined and renders as empty string',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"\\" is undefined and renders as empty string",
          }
      `);
  });

  test('empty tags is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{tags}}" is an empty array and renders as empty string',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: [],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"\\" is an empty array and renders as empty string",
          }
      `);
  });

  test('spaceId is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{spaceId}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"spaceId-A\\" exists",
          }
      `);
  });

  test('alertInstanceId is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertInstanceId}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"2\\" exists",
          }
      `);
  });

  test('alertActionGroup is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertActionGroup}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"action-group\\" exists",
          }
      `);
  });

  test('alertActionGroupName is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertActionGroupName}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"Action Group\\" exists",
          }
      `);
  });

  test('rule variables are passed to templates', () => {
    const actionParams = {
      message: 'Value "{{rule.id}}", "{{rule.name}}", "{{rule.spaceId}}" and "{{rule.tags}}" exist',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"1\\", \\"alert-name\\", \\"spaceId-A\\" and \\"tag-A,tag-B\\" exist",
          }
      `);
  });

  test('rule alert variables are passed to templates', () => {
    const actionParams = {
      message:
        'Value "{{alert.id}}", "{{alert.actionGroup}}", "{{alert.uuid}}" and "{{alert.actionGroupName}}" exist',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"2\\", \\"action-group\\", \\"uuid-1\\" and \\"Action Group\\" exist",
          }
      `);
  });

  test('date is passed to templates', () => {
    const actionParams = {
      message: '{{date}}',
    };
    const dateBefore = Date.now();
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    const dateAfter = Date.now();
    const dateVariable = new Date(`${result.message}`).valueOf();

    expect(dateVariable).toBeGreaterThanOrEqual(dateBefore);
    expect(dateVariable).toBeLessThanOrEqual(dateAfter);
  });

  test('works recursively', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: { value: 'state' },
      context: { value: 'context' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "message": "State: \\"state\\", Context: \\"context\\"",
          },
        }
    `);
  });

  test('works recursively with arrays', () => {
    const actionParams = {
      body: {
        messages: ['State: "{{state.value}}", Context: "{{context.value}}"'],
      },
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: { value: 'state' },
      context: { value: 'context' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "messages": Array [
              "State: \\"state\\", Context: \\"context\\"",
            ],
          },
        }
    `);
  });

  test('flapping is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alert.flapping}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: true,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"true\\" exists",
          }
      `);
  });

  test('alerts as data doc is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{kibana.alert.rule.name}}" exists and {{context.foo}} exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: { foo: 'fooVal' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
      aadAlert: {
        // @ts-expect-error
        kibana: {
          alert: {
            url: '/app/management/insightsAndAlerting/triggersActions/rule/a36916ad-9e7e-4fb6-acb7-ff5ac6621fa9',
            reason:
              'Document count is 145 in the last 5d in .kibana-event-log* index. Alert when greater than 0.',
            title: "rule 'test again' matched query",
            evaluation: {
              conditions: 'Number of matching documents is greater than 0',
              value: '145',
              threshold: 0,
            },
            rule: {
              category: 'Elasticsearch query',
              consumer: 'stackAlerts',
              execution: {
                uuid: '9db2f40d-ae46-47c6-9d94-4b7f538ccc99',
              },
              name: 'test again',
              parameters: {
                searchType: 'esQuery',
                timeWindowSize: 5,
                timeWindowUnit: 'd',
                threshold: [0],
                thresholdComparator: '>',
                size: 100,
                esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
                aggType: 'count',
                groupBy: 'all',
                termSize: 5,
                sourceFields: [],
                index: ['.kibana-event-log*'],
                timeField: '@timestamp',
                excludeHitsFromPreviousRun: false,
              },
              producer: 'stackAlerts',
              rule_type_id: '.es-query',
              tags: [],
              uuid: 'a36916ad-9e7e-4fb6-acb7-ff5ac6621fa9',
              revision: 0,
            },
            action_group: 'query matched',
            flapping_history: [
              true,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
            ],
            instance: {
              id: 'query matched',
            },
            maintenance_window_ids: [],
            status: 'active',
            uuid: '6b02fc1e-a297-468d-a3a2-f0e8fdc03dbf',
            workflow_status: 'open',
            start: '2024-01-26T13:54:14.044Z',
            time_range: {
              gte: '2024-01-26T13:54:14.044Z',
            },
            duration: {
              us: 752537000,
            },
            flapping: false,
          },
          space_ids: ['default'],
          version: '8.13.0',
        },
        '@timestamp': '2024-01-26T14:06:46.581Z',
        event: {
          action: 'active',
          kind: 'signal',
        },
        tags: [],
      },
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"test again\\" exists and fooVal exists",
          }
      `);
  });

  test('flattened alerts as data doc is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{kibana.alert.rule.name}}" exists and {{context.foo}} exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: { foo: 'fooVal' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
      aadAlert: {
        'kibana.alert.url':
          '/app/management/insightsAndAlerting/triggersActions/rule/a36916ad-9e7e-4fb6-acb7-ff5ac6621fa9',
        'kibana.alert.reason':
          'Document count is 145 in the last 5d in .kibana-event-log* index. Alert when greater than 0.',
        // @ts-expect-error
        'kibana.alert.title': "rule 'test again' matched query",
        'kibana.alert.evaluation.conditions': 'Number of matching documents is greater than 0',
        'kibana.alert.evaluation.value': '145',
        'kibana.alert.evaluation.threshold': 0,
        'kibana.alert.rule.category': 'Elasticsearch query',
        'kibana.alert.rule.consumer': 'stackAlerts',
        'kibana.alert.rule.execution.uuid': '9db2f40d-ae46-47c6-9d94-4b7f538ccc99',
        'kibana.alert.rule.name': 'test again',
        'kibana.alert.rule.producer': 'stackAlerts',
        'kibana.alert.rule.rule_type_id': '.es-query',
        'kibana.alert.rule.uuid': 'a36916ad-9e7e-4fb6-acb7-ff5ac6621fa9',
        'kibana.alert.action_group': 'query matched',
        'kibana.alert.instance.id': 'query matched',
        'kibana.alert.status': 'active',
        'kibana.alert.start': '2024-01-26T13:54:14.044Z',
        'kibana.alert.duration.us': 752537000,
        '@timestamp': '2024-01-26T14:06:46.581Z',
        'event.action': 'active',
        'event.kind': 'signal',
        tags: [],
      },
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"test again\\" exists and fooVal exists",
          }
      `);
  });

  test('consecutive matches is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alert.consecutiveMatches}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertUuid: 'uuid-1',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: true,
      consecutiveMatches: 4,
    });
    expect(result).toMatchInlineSnapshot(`
          Object {
            "message": "Value \\"4\\" exists",
          }
      `);
  });
});

describe('transformSummaryActionParams', () => {
  const params = {
    alerts: {
      new: { count: 1, data: [mockAAD] },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
      all: { count: 1, data: [mockAAD] },
    },
    rule: {
      id: '1',
      name: 'test-rule',
      tags: ['test-tag'],
      params: { foo: 'bar', fooBar: true },
    } as SanitizedRule,
    ruleTypeId: 'rule-type-id',
    actionId: 'action-id',
    spaceId: 'space-id',
    actionsPlugin,
    actionTypeId,
    ruleUrl: 'http://ruleurl',
    kibanaBaseUrl: 'http://kibanaurl',
  };

  test('renders rule values', () => {
    const actionParams = {
      message:
        'Value "{{rule.id}}", "{{rule.name}}", "{{rule.spaceId}}", "{{rule.type}}", "{{rule.url}}" and "{{rule.tags}}" exist',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"1\\", \\"test-rule\\", \\"space-id\\", \\"rule-type-id\\", \\"http://ruleurl\\" and \\"test-tag\\" exist",
        }
    `);
  });

  test('renders aliased context values', () => {
    const actionParams = {
      message:
        'Value "{{context.alerts}}", "{{context.results_link}}" and "{{context.rule}}" exist',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value \\"{\\"@timestamp\\":\\"2022-12-07T15:38:43.472Z\\",\\"event\\":{\\"kind\\":\\"signal\\",\\"action\\":\\"active\\"},\\"kibana\\":{\\"version\\":\\"8.7.0\\",\\"space_ids\\":[\\"default\\"],\\"alert\\":{\\"instance\\":{\\"id\\":\\"*\\"},\\"uuid\\":\\"2d3e8fe5-3e8b-4361-916e-9eaab0bf2084\\",\\"status\\":\\"active\\",\\"workflow_status\\":\\"open\\",\\"reason\\":\\"system.cpu is 90% in the last 1 min for all hosts. Alert when > 50%.\\",\\"time_range\\":{\\"gte\\":\\"2022-01-01T12:00:00.000Z\\"},\\"start\\":\\"2022-12-07T15:23:13.488Z\\",\\"duration\\":{\\"us\\":100000},\\"flapping\\":false,\\"rule\\":{\\"category\\":\\"Metric threshold\\",\\"consumer\\":\\"alerts\\",\\"execution\\":{\\"uuid\\":\\"c35db7cc-5bf7-46ea-b43f-b251613a5b72\\"},\\"name\\":\\"test-rule\\",\\"producer\\":\\"infrastructure\\",\\"revision\\":0,\\"rule_type_id\\":\\"metrics.alert.threshold\\",\\"uuid\\":\\"0de91960-7643-11ed-b719-bb9db8582cb6\\",\\"tags\\":[]}}}}\\", \\"http://ruleurl\\" and \\"{\\"foo\\":\\"bar\\",\\"foo_bar\\":true,\\"name\\":\\"test-rule\\",\\"id\\":\\"1\\"}\\" exist",
      }
    `);
  });

  test('renders aliased state values', () => {
    const actionParams = {
      message: 'Value "{{state.signals_count}}" exists',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"1\\" exists",
        }
    `);
  });

  test('renders alerts values', () => {
    const actionParams = {
      message:
        'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}} ' +
        'Alert Name: {{#alerts.new.data}} {{kibana.alert.rule.name}} {{/alerts.new.data}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "New: 1 Ongoing: 0 Recovered: 0 Alert Name:  test-rule ",
        }
    `);
  });

  test('renders kibanaBaseUrl', () => {
    const actionParams = {
      message: 'Value: {{kibanaBaseUrl}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value: http://kibanaurl",
        }
    `);
  });

  test('date is passed to templates', () => {
    const actionParams = {
      message: '{{date}}',
    };
    const dateBefore = Date.now();
    const result = transformSummaryActionParams({ ...params, actionParams });
    const dateAfter = Date.now();
    const dateVariable = new Date(`${result.message}`).valueOf();

    expect(dateVariable).toBeGreaterThanOrEqual(dateBefore);
    expect(dateVariable).toBeLessThanOrEqual(dateAfter);
  });

  test('renders alertId', () => {
    const actionParams = {
      message: 'Value: {{alertId}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value: 1",
        }
    `);
  });

  test('renders alertName', () => {
    const actionParams = {
      message: 'Value: {{alertName}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value: test-rule",
        }
    `);
  });

  test('renders spaceId', () => {
    const actionParams = {
      message: 'Value: {{spaceId}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value: space-id",
      }
    `);
  });

  test('renders tags', () => {
    const actionParams = {
      message: 'Value: {{tags}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value: test-tag",
      }
    `);
  });

  test('renders params', () => {
    const actionParams = {
      message: 'Value: {{params}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value: {\\"foo\\":\\"bar\\",\\"fooBar\\":true}",
      }
    `);
  });

  test('renders alertInstanceId', () => {
    const actionParams = {
      message: 'Value: {{alertInstanceId}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value: 1",
      }
    `);
  });

  test('renders alertActionGroup', () => {
    const actionParams = {
      message: 'Value: {{alertActionGroup}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value: default",
      }
    `);
  });

  test('renders alertActionGroupName', () => {
    const actionParams = {
      message: 'Value: {{alertActionGroupName}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value: Default",
      }
    `);
  });

  test('renders alert values', () => {
    const actionParams = {
      message:
        'Value "{{alert.id}}", "{{alert.uuid}}", "{{alert.actionGroup}}", "{{alert.actionGroupName}}", and "{{alert.flapping}}" exist',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "Value \\"1\\", \\"1\\", \\"default\\", \\"Default\\", and \\"false\\" exist",
      }
    `);
  });
});
