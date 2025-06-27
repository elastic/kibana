/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import type { LensApi } from '@kbn/lens-plugin/public';
import {
  createParentApiMock,
  getLensApiMock,
  makeEmbeddableServices,
} from '@kbn/lens-plugin/public/mocks';
import { DimensionType } from '@kbn/expressions-plugin/common';
import { last } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { AlertRuleFromVisAction } from './alert_rule_from_vis_ui_action';
import * as AlertFlyoutComponentModule from './rule_flyout_component';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { AggregateQuery, Query } from '@kbn/es-query';

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

const parentApiMock = createParentApiMock();

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
  parentApi: parentApiMock,
});

const startDependenciesMock = {
  ...makeEmbeddableServices(),
  fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
};
const spy = jest.spyOn(AlertFlyoutComponentModule, 'getRuleFlyoutComponent');

describe('AlertRuleFromVisAction', () => {
  const action = new AlertRuleFromVisAction(
    ruleTypeRegistry,
    actionTypeRegistry,
    startDependenciesMock
  );

  const getCreateAlertRuleLastCalledInitialValues = () => last(spy.mock.calls ?? [])?.[4];

  afterAll(() => {
    // clear the spy created with spyOn
    jest.clearAllMocks();
  });

  it("creates a rule with the visualization's ES|QL query plus an additional threshold line", async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | STATS count = COUNT(*)',
        thresholdValues: [{ values: { count: 210 }, yField: 'count' }],
        xValues: {},
      },
    });

    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | STATS count = COUNT(*)
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE count >= 210",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('appends a single xValue to the threshold line with an AND operator', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | STATS count = COUNT(*) BY uhhhhhhhh.field',
        thresholdValues: [{ values: { count: 210 }, yField: 'count' }],
        xValues: { 'uhhhhhhhh.field': 'zoop' },
      },
    });

    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | STATS count = COUNT(*) BY uhhhhhhhh.field
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE uhhhhhhhh.field == \\"zoop\\" AND count >= 210",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('appends multiple fields in the threshold value with an AND operator', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | STATS count = COUNT(*) BY uhhhhhhhh.field',
        thresholdValues: [{ values: { count: 210, 'uhhhhhhhh.field': 'zoop' }, yField: 'count' }],
        xValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | STATS count = COUNT(*) BY uhhhhhhhh.field
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE uhhhhhhhh.field == \\"zoop\\" AND count >= 210",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('appends multiple thresholdValues threshold line in parentheses separated by OR operators', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | KEEP geo.dest, bytes, memory, extension.keyword',
        thresholdValues: [
          { values: { bytes: 5000, 'extension.keyword': 'deb' }, yField: 'bytes' },
          { values: { memory: 50000, 'extension.keyword': 'rpm' }, yField: 'memory' },
        ],
        xValues: { 'geo.dest': 'JP' },
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | KEEP geo.dest, bytes, memory, extension.keyword
      // Threshold automatically generated from the selected values on the chart. This rule will generate an alert based on the following conditions:
      | WHERE geo.dest == \\"JP\\" AND ((extension.keyword == \\"deb\\" AND bytes >= 5000) OR (extension.keyword == \\"rpm\\" AND memory >= 50000))",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('converts an array xValue to MATCH queries', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | KEEP tags, something.else',
        thresholdValues: [{ values: { 'something.else': 3087 }, yField: 'something.else' }],
        xValues: { tags: 'shibbity,bee,bop,doowop' },
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | KEEP tags, something.else
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE MATCH(tags, \\"shibbity\\") AND MATCH(tags, \\"bee\\") AND MATCH(tags, \\"bop\\") AND MATCH(tags, \\"doowop\\") AND something.else >= 3087",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('converts an array in a threshold value to MATCH queries', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | KEEP something.else, @tags.keyword',
        thresholdValues: [
          {
            values: {
              'something.else': 3087,
              '@tags.keyword': 'login,warning',
            },
            yField: 'something.else',
          },
        ],
        xValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | KEEP something.else, @tags.keyword
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE MATCH(@tags.keyword, \\"login\\") AND MATCH(@tags.keyword, \\"warning\\") AND something.else >= 3087",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('renders empty splitValues as empty strings', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | KEEP tags, something.else',
        thresholdValues: [
          {
            values: { 'something.else': 3087, tags: '' },
            yField: 'something.else',
          },
        ],
        xValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | KEEP tags, something.else
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE tags == \\"\\" AND something.else >= 3087",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('escapes unnamed function columns', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query:
          'FROM index | RENAME bytes as `meow bytes` | STATS COUNT(*), PERCENTILE(owowo, 99), COUNT(`meow bytes`)',
        thresholdValues: [
          {
            values: { 'COUNT(*)': 210 },
            yField: 'COUNT(*)',
          },
          { values: { 'PERCENTILE(owowo, 99)': 42.6 }, yField: 'PERCENTILE(owowo, 99)' },
          { values: { 'COUNT(`meow bytes`)': 1312 }, yField: 'COUNT(`meow bytes`)' },
        ],
        xValues: {},
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | RENAME bytes as \`meow bytes\` | STATS COUNT(*), PERCENTILE(owowo, 99), COUNT(\`meow bytes\`)
      // Rename the following columns so they can be used as part of the alerting threshold:
      | RENAME \`COUNT(*)\` as _count | RENAME \`PERCENTILE(owowo,99)\` as _percentile_owowo_99 | RENAME \`COUNT(\`\`meow bytes\`\`)\` as _count_meow_bytes 
      // Threshold automatically generated from the selected values on the chart. This rule will generate an alert based on the following conditions:
      | WHERE _count >= 210 OR _percentile_owowo_99 >= 42.6 OR _count_meow_bytes >= 1312",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('does not duplicate function column renames when they are included in multiple threshold values', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query:
          'FROM logst* | RENAME bytes as `meow bytes` | STATS COUNT(`meow bytes`) BY clientip, extension',
        thresholdValues: [
          {
            values: { 'COUNT(`meow bytes`)': 634, clientip: '131.250.144.62' },
            yField: 'COUNT(`meow bytes`)',
          },
          {
            values: { 'COUNT(`meow bytes`)': 682, clientip: '7.203.207.131' },
            yField: 'COUNT(`meow bytes`)',
          },
        ],
        xValues: { extension: 'jpg' },
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM logst* | RENAME bytes as \`meow bytes\` | STATS COUNT(\`meow bytes\`) BY clientip, extension
      // Rename the following columns so they can be used as part of the alerting threshold:
      | RENAME \`COUNT(\`\`meow bytes\`\`)\` as _count_meow_bytes 
      // Threshold automatically generated from the selected values on the chart. This rule will generate an alert based on the following conditions:
      | WHERE extension == \\"jpg\\" AND ((clientip == \\"131.250.144.62\\" AND _count_meow_bytes >= 634) OR (clientip == \\"7.203.207.131\\" AND _count_meow_bytes >= 682))",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  it('escapes string values with backlashes in them', async () => {
    await action.execute({
      embeddable: embeddableMock,
      data: {
        query: 'FROM index | STATS count = COUNT(*) BY CATEGORIZE(message)',
        thresholdValues: [
          {
            values: { 'COUNT(*)': 1 },
            yField: 'COUNT(*)',
          },
        ],
        xValues: {
          'CATEGORIZE(message)':
            '.*?GET .+?HTTP/1\\.1.+?Mozilla/5\\.0.+?X11.+?Linux.+?x86_64.+?rv.+?Gecko/20110421.+?Firefox/6\\.0a',
        },
      },
    });
    expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
      Object {
        "name": "Elasticsearch query rule from visualization",
        "params": Object {
          "esqlQuery": Object {
            "esql": "// Original ES|QL query derived from the visualization:
      FROM index | STATS count = COUNT(*) BY CATEGORIZE(message)
      // Rename the following columns so they can be used as part of the alerting threshold:
      | RENAME \`COUNT(*)\` as _count | RENAME \`CATEGORIZE(message)\` as _categorize_message 
      // Threshold automatically generated from the selected value on the chart. This rule will generate an alert based on the following conditions:
      | WHERE _categorize_message == \\".*?GET .+?HTTP/1\\\\\\\\.1.+?Mozilla/5\\\\\\\\.0.+?X11.+?Linux.+?x86_64.+?rv.+?Gecko/20110421.+?Firefox/6\\\\\\\\.0a\\" AND _count >= 1",
          },
          "searchType": "esqlQuery",
          "timeField": "@timestamp",
        },
        "tags": Array [],
      }
    `);
  });

  describe('when executed without a data parameter', () => {
    it('derives data from the embeddable and uses placeholder threshold values', async () => {
      const embeddable = getLensApiMock({
        query$: new BehaviorSubject<Query | AggregateQuery | undefined>({
          esql: 'FROM index | STATS count = COUNT(*)',
        }),
        getInspectorAdapters: jest.fn(() => ({
          tables: {
            tables: {
              foo: {
                columns: [
                  {
                    meta: {
                      dimensionName: 'Vertical axis',
                      dimensionType: DimensionType.Y_AXIS,
                      sourceParams: { sourceField: 'count' },
                      type: 'number',
                    },
                  },
                  {
                    meta: {
                      dimensionName: 'Horizontal axis',
                      dimensionType: DimensionType.X_AXIS,
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
        })) as unknown as LensApi['serializeState'],
        parentApi: parentApiMock,
      });
      await action.execute({ embeddable });
      expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
        Object {
          "name": "Elasticsearch query rule from visualization",
          "params": Object {
            "esqlQuery": Object {
              "esql": "// Original ES|QL query derived from the visualization:
        FROM index | STATS count = COUNT(*)
        // Modify the following conditions to set an alert threshold for this rule:
        | WHERE count >= [THRESHOLD]",
            },
            "searchType": "esqlQuery",
            "timeField": "timestamp",
          },
          "tags": Array [],
        }
      `);
    });
    it('uses placeholder split values when the X axis is not a timestamp', async () => {
      const embeddable = getLensApiMock({
        query$: new BehaviorSubject<Query | AggregateQuery | undefined>({
          esql: 'FROM index | STATS count = COUNT(*) BY group',
        }),
        getInspectorAdapters: jest.fn(() => ({
          tables: {
            tables: {
              foo: {
                columns: [
                  {
                    meta: {
                      dimensionName: 'Vertical axis',
                      dimensionType: DimensionType.Y_AXIS,
                      sourceParams: { sourceField: 'count' },
                      type: 'number',
                    },
                  },
                  {
                    meta: {
                      dimensionName: 'Horizontal axis',
                      dimensionType: DimensionType.X_AXIS,
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
        })) as unknown as LensApi['serializeState'],
      });
      await action.execute({ embeddable });
      expect(getCreateAlertRuleLastCalledInitialValues()).toMatchInlineSnapshot(`
        Object {
          "name": "Elasticsearch query rule from visualization",
          "params": Object {
            "esqlQuery": Object {
              "esql": "// Original ES|QL query derived from the visualization:
        FROM index | STATS count = COUNT(*) BY group
        // Modify the following conditions to set an alert threshold for this rule:
        | WHERE group == \\"[VALUE]\\" AND count >= [THRESHOLD]",
            },
            "searchType": "esqlQuery",
            "timeField": "timestamp",
          },
          "tags": Array [],
        }
      `);
    });
  });
});
