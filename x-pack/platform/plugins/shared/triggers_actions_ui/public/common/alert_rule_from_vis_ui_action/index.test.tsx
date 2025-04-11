/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import type { LensApi } from '@kbn/lens-plugin/public';
import { getLensApiMock } from '@kbn/lens-plugin/public/react_embeddable/mocks';
import { last } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { AlertRuleFromVisAction } from '.';

const ruleTypeRegistry: jest.Mocked<RuleTypeRegistryContract> = {
  has: jest.fn(),
  register: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
};
const actionTypeRegistry: jest.Mocked<ActionTypeRegistryContract> = {
  has: jest.fn(),
  register: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
};

const embeddableMock = getLensApiMock({
  serializeState: jest.fn(() => ({
    rawState: {
      attributes: {
        state: {
          datasourceStates: {
            textBased: {
              layers: [
                {
                  timeField: '@timestamp',
                },
              ],
            },
          },
        },
      },
    },
  })) as unknown as LensApi['serializeState'],
  getInspectorAdapters: jest.fn(() => ({
    tables: {
      tables: [],
    },
  })),
}) as jest.Mocked<LensApi>;
const getCreateAlertRuleLastCalledInitialValues = () =>
  last(embeddableMock.createAlertRule.mock.calls)![0];

describe('AlertRuleFromVisAction', () => {
  const action = new AlertRuleFromVisAction(ruleTypeRegistry, actionTypeRegistry);
  it("creates a rule with the visualization's ES|QL query plus an additional threshold line", () => {
    action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*)',
        thresholdValues: { count: 210 },
        splitValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*)
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE count >= 210",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
      }
    `);
  });

  it('appends a single splitValue to the threshold line with an AND operator', () => {
    action.execute({
      embeddable: embeddableMock,
      data: {
        query:
          'FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*) BY uhhhhhhhh.field',
        thresholdValues: { count: 210 },
        splitValues: { 'uhhhhhhhh.field': ['zoop'] },
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*) BY uhhhhhhhh.field
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE uhhhhhhhh.field == \\"zoop\\" AND count >= 210",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
      }
    `);
  });

  it('appends multiple splitValues to the threshold line in parentheses separated by OR operators', () => {
    action.execute({
      embeddable: embeddableMock,
      data: {
        query:
          'FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*) BY uhhhhhhhh.field',
        thresholdValues: { count: 210 },
        splitValues: { 'uhhhhhhhh.field': ['zoop', 'boop'] },
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*) BY uhhhhhhhh.field
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE (uhhhhhhhh.field == \\"zoop\\" OR uhhhhhhhh.field == \\"boop\\") AND count >= 210",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
      }
    `);
  });

  it('appends multiple thresholdValues separated by AND operators', () => {
    action.execute({
      embeddable: embeddableMock,
      data: {
        query:
          'FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*), p99 = PERCENTILE(owowo, 99)',
        thresholdValues: { count: 210, p99: 42.6 },
        splitValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | STATS count = COUNT(*), p99 = PERCENTILE(owowo, 99)
      // Threshold automatically generated from the selected values on the chart. This rule will generate an alert based on the following conditions:
      | WHERE count >= 210 AND p99 >= 42.6",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
      }
    `);
  });

  it('escapes unnamed function columns', () => {
    action.execute({
      embeddable: embeddableMock,
      data: {
        query:
          'FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | RENAME bytes as `meow bytes` | STATS COUNT(*), PERCENTILE(owowo, 99), COUNT(`meow bytes`)',
        thresholdValues: {
          'COUNT(*)': 210,
          'PERCENTILE(owowo, 99)': 42.6,
          'COUNT(`meow bytes`)': 1312,
        },
        splitValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM uhhh_can_i_get_a_uhhhhhhhhhhhh_index | RENAME bytes as \`meow bytes\` | STATS COUNT(*), PERCENTILE(owowo, 99), COUNT(\`meow bytes\`)
      // Evaluate the following columns so they can be used as part of the alerting threshold:
      | EVAL _count = \`COUNT(*)\` | EVAL _percentile_owowo_99 = \`PERCENTILE(owowo, 99)\` | EVAL _count_meow_bytes = \`COUNT(\`meow bytes\`)\` 
      // Threshold automatically generated from the selected values on the chart. This rule will generate an alert based on the following conditions:
      | WHERE _count >= 210 AND _percentile_owowo_99 >= 42.6 AND _count_meow_bytes >= 1312",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
      }
    `);
  });

  describe('when executed without a data parameter', () => {
    it('derives data from the embeddable and uses placeholder threshold values', () => {
      const embeddable = getLensApiMock({
        query$: new BehaviorSubject({
          esql: 'FROM eyyyy_look_at_my_index | STATS count = COUNT(*)',
        }),
        getInspectorAdapters: jest.fn(() => ({
          tables: {
            tables: {
              foo: {
                columns: [
                  {
                    meta: {
                      dimensionName: 'Vertical axis',
                      sourceParams: { sourceField: 'count' },
                      type: 'number',
                    },
                  },
                  {
                    meta: {
                      dimensionName: 'Horizontal axis',
                      sourceParams: { sourceField: 'timestamp' },
                      type: 'date',
                    },
                  },
                ],
              },
            },
          },
        })),
        serializeState: jest.fn(() => ({
          rawState: {
            state: {
              attributes: {
                datasourceStates: {
                  textBased: {
                    layers: [
                      {
                        timeField: 'timestamp',
                      },
                    ],
                  },
                },
              },
            },
          },
        })),
      } as Partial<LensApi>) as jest.Mocked<LensApi>;
      action.execute({ embeddable });
      expect(last(embeddable.createAlertRule.mock.calls)![0]).toMatchInlineSnapshot(`
        Object {
          "params": Object {
            "esqlQuery": Object {
              "esql": "// Original ES|QL query derived from the visualization:
        FROM eyyyy_look_at_my_index | STATS count = COUNT(*)
        // Modify the following conditions to set an alert threshold for this rule:
        | WHERE count >= [THRESHOLD]",
            },
            "searchType": "esqlQuery",
            "timeField": "timestamp",
          },
        }
      `);
    });
    it('uses placeholder split values when the X axis is not a timestamp', () => {
      const embeddable = getLensApiMock({
        query$: new BehaviorSubject({
          esql: 'FROM eyyyy_look_at_my_index | STATS count = COUNT(*) BY group',
        }),
        getInspectorAdapters: jest.fn(() => ({
          tables: {
            tables: {
              foo: {
                columns: [
                  {
                    meta: {
                      dimensionName: 'Vertical axis',
                      sourceParams: { sourceField: 'count' },
                      type: 'number',
                    },
                  },
                  {
                    meta: {
                      dimensionName: 'Horizontal axis',
                      sourceParams: { sourceField: 'group' },
                      type: 'keyword',
                    },
                  },
                ],
              },
            },
          },
        })),
        serializeState: jest.fn(() => ({
          rawState: {
            state: {
              attributes: {
                datasourceStates: {
                  textBased: {
                    layers: [
                      {
                        timeField: 'timestamp',
                      },
                    ],
                  },
                },
              },
            },
          },
        })),
      } as Partial<LensApi>) as jest.Mocked<LensApi>;
      action.execute({ embeddable });
      expect(last(embeddable.createAlertRule.mock.calls)![0]).toMatchInlineSnapshot(`
        Object {
          "params": Object {
            "esqlQuery": Object {
              "esql": "// Original ES|QL query derived from the visualization:
        FROM eyyyy_look_at_my_index | STATS count = COUNT(*) BY group
        // Modify the following conditions to set an alert threshold for this rule:
        | WHERE group == \\"[VALUE]\\" AND count >= [THRESHOLD]",
            },
            "searchType": "esqlQuery",
            "timeField": "timestamp",
          },
        }
      `);
    });
  });
});
