/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createRuleDataBaseSchema } from './rule_data_schema';
import { ruleTemplateDataSchema } from './rule_template_schema';

const exampleTemplateAttributes = {
  kind: 'alert' as const,
  engine: 'v2' as const,
  metadata: {
    name: '[Kubernetes OTel] Pod CrashLoopBackOff',
    description: 'Alerts when containers have a high restart count, indicating CrashLoopBackOff.',
    tags: ['Kubernetes'],
  },
  schedule: {
    every: '1m',
    lookback: '15m',
  },
  state_transition: {
    pending_count: 3,
  },
  recovery_strategy: 'no_breach' as const,
  artifacts: [
    {
      id: 'kubernetes_otel-pod-crashloopbackoff-v2-runbook',
      type: 'runbook',
      data: {
        content: '## Pod CrashLoopBackOff\n\n### Triage Steps\n1. Identify the affected pod(s).',
      },
    },
  ],
  query: {
    format: 'composed' as const,
    base: 'TS metrics-k8sclusterreceiver.otel-*\n| STATS restarts = MAX(k8s.container.restarts)\n    BY k8s.pod.name, k8s.container.name, k8s.namespace.name',
    breach: {
      segment:
        'WHERE restarts > 0\n| SORT restarts DESC\n| KEEP k8s.namespace.name, k8s.pod.name, k8s.container.name, restarts\n| LIMIT 50',
    },
  },
  grouping: {
    fields: ['k8s.pod.name', 'k8s.container.name', 'k8s.namespace.name'],
  },
  time_field: '@timestamp',
};

describe('ruleTemplateDataSchema', () => {
  it('parses valid template attributes', () => {
    const result = ruleTemplateDataSchema.parse(exampleTemplateAttributes);
    expect(result.engine).toBe('v2');
  });

  it('rejects a v1 rule template', () => {
    const v1RuleTemplate = {
      name: 'Sample alerting rule template',
      tags: ['Testing'],
      description: 'This is a sample alerting rule template description',
      artifacts: {
        dashboards: [{ id: 'dash-1' }],
        investigation_guide: { blob: 'text' },
      },
      ruleTypeId: '.index-threshold',
      schedule: {
        interval: '1m',
      },
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['logs-test-default'],
        timeField: '@timestamp',
      },
      alertDelay: {
        active: 1,
      },
    };

    expect(() => ruleTemplateDataSchema.parse(v1RuleTemplate)).toThrow();
  });
});

/**
 * Tripwire: the template schema must stay derived from the create-rule base
 * (same Zod object per field), not a forked copy.
 */
describe('rule template create-rule schema coupling', () => {
  const toStableJsonSchema = (schema: z.ZodType) => {
    const { $schema: _schema, ...rest } = z.toJSONSchema(schema, {
      target: 'draft-7',
      unrepresentable: 'any',
    }) as Record<string, unknown>;
    return rest;
  };

  it('template keys match create-rule keys plus engine', () => {
    const createRuleKeys = new Set(Object.keys(createRuleDataBaseSchema.shape));
    const templateKeys = Object.keys(ruleTemplateDataSchema.shape);

    const templateRuleKeys = templateKeys.filter((key) => key !== 'engine').sort();
    const createKeysSorted = [...createRuleKeys].sort();

    expect({
      hint: 'Rule template top-level fields drifted from create-rule. Keep ruleTemplateDataSchema = createRuleDataBaseSchema.extend({ engine }).',
      templateRuleKeys,
      createKeysSorted,
    }).toEqual({
      hint: 'Rule template top-level fields drifted from create-rule. Keep ruleTemplateDataSchema = createRuleDataBaseSchema.extend({ engine }).',
      templateRuleKeys: createKeysSorted,
      createKeysSorted,
    });

    if (!templateKeys.includes('engine')) {
      throw new Error('Rule template schema is missing required field "engine".');
    }
  });

  it('reuses create-rule field schemas by reference (not a forked copy)', () => {
    const createShape = createRuleDataBaseSchema.shape;
    const templateShape = ruleTemplateDataSchema.shape;

    for (const key of Object.keys(createShape) as Array<keyof typeof createShape>) {
      if (templateShape[key] !== createShape[key]) {
        throw new Error(
          `Rule template field "${String(key)}" is not the same Zod schema as create-rule. ` +
            `Keep ruleTemplateDataSchema = createRuleDataBaseSchema.extend({ engine }).`
        );
      }
    }
  });

  /**
   * Full structural snapshot of the create-rule base schema.
   * When create-rule changes, update this snapshot and confirm the template
   * schema still extends the same base. If a new model version was added
   * for create rule, a new model version is needed for the template.
   */
  it('matches the snapshot of the full create-rule JSON schema', () => {
    expect({
      hint: 'Create-rule schema changed. Update this snapshot and confirm ruleTemplateDataSchema still extends createRuleDataBaseSchema.',
      schema: toStableJsonSchema(createRuleDataBaseSchema),
    }).toMatchInlineSnapshot(`
      Object {
        "hint": "Create-rule schema changed. Update this snapshot and confirm ruleTemplateDataSchema still extends createRuleDataBaseSchema.",
        "schema": Object {
          "additionalProperties": false,
          "properties": Object {
            "artifacts": Object {
              "description": "Artifacts attached to the rule, each shaped as \`{ id, type, data }\`. \`data\` carries type-specific fields: a \`runbook\` artifact requires \`data.content\` holding markdown, and a \`dashboard\` artifact requires \`data.dashboardId\` holding a dashboard saved object id. Artifacts of any other type may carry whatever fields they need in \`data\`.",
              "items": Object {
                "additionalProperties": false,
                "properties": Object {
                  "data": Object {
                    "additionalProperties": Object {},
                    "description": "Structured artifact data.",
                    "propertyNames": Object {
                      "maxLength": 256,
                      "minLength": 1,
                      "type": "string",
                    },
                    "type": "object",
                  },
                  "id": Object {
                    "description": "Artifact identifier.",
                    "maxLength": 256,
                    "minLength": 1,
                    "type": "string",
                  },
                  "type": Object {
                    "description": "Artifact type.",
                    "maxLength": 128,
                    "minLength": 1,
                    "type": "string",
                  },
                },
                "required": Array [
                  "id",
                  "type",
                  "data",
                ],
                "type": "object",
              },
              "maxItems": 100,
              "type": "array",
            },
            "grouping": Object {
              "additionalProperties": false,
              "description": "Grouping configuration.",
              "properties": Object {
                "fields": Object {
                  "description": "Fields to group alerts by, e.g. [\\"host.name\\", \\"service.name\\"]. Should match ES|QL GROUP BY fields.",
                  "items": Object {
                    "maxLength": 256,
                    "minLength": 1,
                    "type": "string",
                  },
                  "maxItems": 16,
                  "type": "array",
                },
              },
              "required": Array [
                "fields",
              ],
              "type": "object",
            },
            "kind": Object {
              "description": "Rule kind: \\"alert\\" for stateful alerting with transitions, \\"signal\\" for stateless detection.",
              "enum": Array [
                "alert",
                "signal",
              ],
              "type": "string",
            },
            "metadata": Object {
              "additionalProperties": false,
              "description": "Rule metadata.",
              "properties": Object {
                "builder_type": Object {
                  "description": "Identifies the rule builder that authored this rule (e.g. \\"threshold\\"). Absent for rules authored directly in ES|QL.",
                  "maxLength": 64,
                  "type": "string",
                },
                "description": Object {
                  "description": "Human-readable description of the rule.",
                  "maxLength": 1024,
                  "type": "string",
                },
                "name": Object {
                  "description": "Rule name (must be unique within the space).",
                  "maxLength": 256,
                  "minLength": 1,
                  "type": "string",
                },
                "owner": Object {
                  "description": "Owner of the rule.",
                  "maxLength": 256,
                  "type": "string",
                },
                "tags": Object {
                  "description": "Tags for categorization, e.g. [\\"production\\", \\"infra\\"].",
                  "items": Object {
                    "maxLength": 128,
                    "minLength": 1,
                    "type": "string",
                  },
                  "maxItems": 20,
                  "minItems": 1,
                  "type": "array",
                },
              },
              "required": Array [
                "name",
              ],
              "type": "object",
            },
            "no_data_strategy": Object {
              "description": "How to handle no-data situations. \\"last_known_status\\" holds the last known status; \\"recover\\" forces recovery; \\"none\\" disables no-data detection. \\"emit\\" is not currently accepted by the create/update API. Standalone-format rules must provide a \`no_data\` query block when this is not \\"none\\"; composed-format rules use \`base\` as the data-presence query.",
              "enum": Array [
                "last_known_status",
                "emit",
                "recover",
                "none",
              ],
              "type": "string",
            },
            "query": Object {
              "description": "Detection query configuration.",
              "oneOf": Array [
                Object {
                  "additionalProperties": false,
                  "description": "Composed query: a shared base with appendable breach and recovery segments.",
                  "properties": Object {
                    "base": Object {
                      "description": "Base ES|QL query. Time filters are applied automatically via the lookback window.",
                      "maxLength": 10000,
                      "minLength": 1,
                      "type": "string",
                    },
                    "breach": Object {
                      "additionalProperties": false,
                      "description": "Breach detection configuration (required).",
                      "properties": Object {
                        "segment": Object {
                          "description": "Appendable ES|QL segment for breach detection (required).",
                          "maxLength": 10000,
                          "minLength": 1,
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "segment",
                      ],
                      "type": "object",
                    },
                    "format": Object {
                      "const": "composed",
                      "type": "string",
                    },
                    "recovery": Object {
                      "additionalProperties": false,
                      "description": "Recovery query segment. Required when recovery_strategy is \\"query\\".",
                      "properties": Object {
                        "segment": Object {
                          "description": "Appendable ES|QL segment for recovery detection.",
                          "maxLength": 10000,
                          "minLength": 1,
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "segment",
                      ],
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "format",
                    "base",
                    "breach",
                  ],
                  "type": "object",
                },
                Object {
                  "additionalProperties": false,
                  "description": "Standalone queries: independent full queries for breach, recovery, and no_data.",
                  "properties": Object {
                    "breach": Object {
                      "additionalProperties": false,
                      "description": "Breach detection configuration (required).",
                      "properties": Object {
                        "query": Object {
                          "description": "Full ES|QL query for breach detection (required).",
                          "maxLength": 10000,
                          "minLength": 1,
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "query",
                      ],
                      "type": "object",
                    },
                    "format": Object {
                      "const": "standalone",
                      "type": "string",
                    },
                    "no_data": Object {
                      "additionalProperties": false,
                      "description": "No-data detection query. Required when no_data_strategy is not \\"none\\".",
                      "properties": Object {
                        "query": Object {
                          "description": "Full ES|QL query that detects presence of data.",
                          "maxLength": 10000,
                          "minLength": 1,
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "query",
                      ],
                      "type": "object",
                    },
                    "recovery": Object {
                      "additionalProperties": false,
                      "description": "Recovery query. Required when recovery_strategy is \\"query\\".",
                      "properties": Object {
                        "query": Object {
                          "description": "Full ES|QL query for recovery detection.",
                          "maxLength": 10000,
                          "minLength": 1,
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "query",
                      ],
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "format",
                    "breach",
                  ],
                  "type": "object",
                },
              ],
            },
            "recovery_strategy": Object {
              "description": "How recovery is detected. \\"no_breach\\" recovers groups that stop breaching; \\"query\\" uses a custom recovery query; \\"none\\" disables recovery.",
              "enum": Array [
                "no_breach",
                "query",
                "none",
              ],
              "type": "string",
            },
            "schedule": Object {
              "additionalProperties": false,
              "description": "Execution schedule configuration.",
              "properties": Object {
                "every": Object {
                  "description": "Execution interval, e.g. 1m, 5m, 1h.",
                  "type": "string",
                },
                "lookback": Object {
                  "description": "Lookback window for the query, e.g. 5m, 1h. Can also be expressed in ES|QL.",
                  "type": "string",
                },
              },
              "required": Array [
                "every",
              ],
              "type": "object",
            },
            "state_transition": Object {
              "anyOf": Array [
                Object {
                  "additionalProperties": false,
                  "description": "Episode state transition thresholds (alert-only).",
                  "properties": Object {
                    "pending_count": Object {
                      "description": "Consecutive breaches before transitioning to active.",
                      "maximum": 1000,
                      "minimum": 0,
                      "type": "integer",
                    },
                    "pending_operator": Object {
                      "description": "How to combine count and timeframe for pending.",
                      "enum": Array [
                        "AND",
                        "OR",
                      ],
                      "type": "string",
                    },
                    "pending_timeframe": Object {
                      "description": "Time window for pending evaluation, e.g. 5m, 15m.",
                      "type": "string",
                    },
                    "recovering_count": Object {
                      "description": "Consecutive recoveries before transitioning to inactive.",
                      "maximum": 1000,
                      "minimum": 0,
                      "type": "integer",
                    },
                    "recovering_operator": Object {
                      "description": "How to combine count and timeframe for recovering.",
                      "enum": Array [
                        "AND",
                        "OR",
                      ],
                      "type": "string",
                    },
                    "recovering_timeframe": Object {
                      "description": "Time window for recovering evaluation, e.g. 5m, 15m.",
                      "type": "string",
                    },
                  },
                  "type": "object",
                },
                Object {
                  "type": "null",
                },
              ],
            },
            "time_field": Object {
              "default": "@timestamp",
              "description": "Time field used for the lookback window range filter.",
              "maxLength": 128,
              "minLength": 1,
              "type": "string",
            },
          },
          "required": Array [
            "kind",
            "metadata",
            "time_field",
            "schedule",
            "query",
          ],
          "type": "object",
        },
      }
    `);
  });

  it('template JSON schema is create-rule plus engine', () => {
    const createJson = toStableJsonSchema(createRuleDataBaseSchema) as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    const templateJson = toStableJsonSchema(ruleTemplateDataSchema) as {
      properties?: Record<string, unknown>;
      required?: string[];
    };

    const { engine, ...templateRuleProperties } = templateJson.properties ?? {};
    expect({
      hint: 'Rule template must add engine:"v2" on top of create-rule properties.',
      engine,
    }).toEqual({
      hint: 'Rule template must add engine:"v2" on top of create-rule properties.',
      engine: {
        type: 'string',
        const: 'v2',
        description: 'The alerting engine this template targets. Always "v2" for v2 templates.',
      },
    });

    expect({
      hint: 'Rule template create-rule properties drifted from createRuleDataBaseSchema. Keep ruleTemplateDataSchema = createRuleDataBaseSchema.extend({ engine }).',
      templateRuleProperties,
      createRuleProperties: createJson.properties,
    }).toEqual({
      hint: 'Rule template create-rule properties drifted from createRuleDataBaseSchema. Keep ruleTemplateDataSchema = createRuleDataBaseSchema.extend({ engine }).',
      templateRuleProperties: createJson.properties,
      createRuleProperties: createJson.properties,
    });

    const templateRequiredWithoutEngine = (templateJson.required ?? [])
      .filter((key) => key !== 'engine')
      .sort();
    expect({
      hint: 'Rule template required fields (excluding engine) must match create-rule required fields.',
      templateRequiredWithoutEngine,
      createRequired: [...(createJson.required ?? [])].sort(),
    }).toEqual({
      hint: 'Rule template required fields (excluding engine) must match create-rule required fields.',
      templateRequiredWithoutEngine: [...(createJson.required ?? [])].sort(),
      createRequired: [...(createJson.required ?? [])].sort(),
    });
  });
});
