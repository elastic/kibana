/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV4 } from './v4';

/**
 * Alerting-v2 create-rule-aligned template attributes (`engine: "v2"`).
 * Distinct from the Fleet / `.es-query` layout in V1–V4.
 */
export const rawRuleTemplateEngineV2Schema = schema.object({
  kind: schema.oneOf([schema.literal('alert'), schema.literal('signal')]),
  engine: schema.literal('v2'),
  metadata: schema.object({
    name: schema.string(),
    description: schema.maybe(schema.string()),
    owner: schema.maybe(schema.string()),
    tags: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })),
    builder_type: schema.maybe(schema.string()),
  }),
  time_field: schema.string(),
  schedule: schema.object({
    every: schema.string(),
    lookback: schema.maybe(schema.string()),
  }),
  recovery_strategy: schema.maybe(
    schema.oneOf([schema.literal('no_breach'), schema.literal('query'), schema.literal('none')])
  ),
  no_data_strategy: schema.maybe(
    schema.oneOf([
      schema.literal('last_known_status'),
      schema.literal('emit'),
      schema.literal('recover'),
      schema.literal('none'),
    ])
  ),
  query: schema.oneOf([
    schema.object({
      format: schema.literal('composed'),
      base: schema.string(),
      breach: schema.object({ segment: schema.string() }),
      recovery: schema.maybe(schema.object({ segment: schema.string() })),
    }),
    schema.object({
      format: schema.literal('standalone'),
      breach: schema.object({ query: schema.string() }),
      recovery: schema.maybe(schema.object({ query: schema.string() })),
      no_data: schema.maybe(schema.object({ query: schema.string() })),
    }),
  ]),
  state_transition: schema.maybe(
    schema.nullable(
      schema.object({
        pending_operator: schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')])),
        pending_count: schema.maybe(schema.number()),
        pending_timeframe: schema.maybe(schema.string()),
        recovering_operator: schema.maybe(
          schema.oneOf([schema.literal('AND'), schema.literal('OR')])
        ),
        recovering_count: schema.maybe(schema.number()),
        recovering_timeframe: schema.maybe(schema.string()),
      })
    )
  ),
  grouping: schema.maybe(
    schema.object({
      fields: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 10 }),
    })
  ),
  artifacts: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
        type: schema.string(),
        value: schema.string(),
      }),
      { maxSize: 100 }
    )
  ),
});

/**
 * Create/read schema for model version 6: Fleet layout (V4) or alerting-v2 layout.
 */
export const rawRuleTemplateSchema = schema.oneOf([
  rawRuleTemplateSchemaV4,
  rawRuleTemplateEngineV2Schema,
]);
