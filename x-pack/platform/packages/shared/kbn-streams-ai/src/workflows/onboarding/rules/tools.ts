/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ruleTools = {
  generate_esql: {
    description:
      'Translate a detailed monitoring intent into one or more ES|QL query strings without executing them.',
    schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description:
            'Natural language description of the desired ES|QL queries, including filters, fields, and aggregations.',
        },
      },
      required: ['question'],
      additionalProperties: false,
    },
  },
  suggest_rules: {
    description: 'Finalize the list of alerting rules to create for this stream.',
    schema: {
      type: 'object',
      properties: {
        rules: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              esql: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  query: {
                    type: 'string',
                    description: 'Complete ES|QL statement evaluated by the rule.',
                  },
                },
                required: ['query'],
              },
              window: {
                type: 'string',
                description: 'Duration the query evaluates (e.g. 5m, 1h).',
              },
              timestampField: {
                type: 'string',
                description: 'Optional time field used for filtering, defaults to @timestamp.',
              },
              interval: {
                type: 'string',
                description: 'Optional execution cadence, defaults to 1m.',
              },
            },
            required: ['esql', 'window'],
          },
          description: 'List of ES|QL-based rule definitions to create.',
        },
      },
      required: ['rules'],
      additionalProperties: false,
    },
  },
} as const;
