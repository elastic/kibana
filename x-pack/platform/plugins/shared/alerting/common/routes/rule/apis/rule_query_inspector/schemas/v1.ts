/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { schema } from '@kbn/config-schema';

export const ruleQueryInspectorExamples = () =>
  path.join(__dirname, 'examples_rule_query_inspector.yaml');

export const ruleQueryInspectorParamsSchema = schema.object({
  id: schema.string({
    meta: { description: 'The identifier for the rule.' },
  }),
});

export const ruleQueryInspectorQuerySchema = schema.object({
  mode: schema.oneOf([schema.literal('build'), schema.literal('execute')], {
    defaultValue: 'build',
    meta: {
      description:
        'The inspection mode. Use "build" to return only the query, or "execute" to run the query and include the response.',
    },
  }),
  alert_id: schema.maybe(
    schema.string({
      meta: {
        description:
          'The alert document ID. When provided, the inspector uses the evaluation time range from the alert instead of the current time.',
      },
    })
  ),
});

const queryResultSchema = schema.object({
  index: schema.string(),
  request: schema.recordOf(schema.string(), schema.any()),
  response: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  label: schema.maybe(schema.string()),
});

export const ruleQueryInspectorResponseSchema = schema.object({
  queries: schema.arrayOf(queryResultSchema, { maxSize: 1000 }),
});
