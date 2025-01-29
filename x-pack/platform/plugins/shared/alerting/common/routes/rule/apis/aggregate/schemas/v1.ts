/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const aggregateRulesRequestBodySchema = schema.object({
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.arrayOf(schema.string())),
  has_reference: schema.maybe(
    // use nullable as maybe is currently broken
    // in config-schema
    schema.nullable(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    )
  ),
  filter: schema.maybe(schema.string()),
  rule_type_ids: schema.maybe(schema.arrayOf(schema.string())),
  consumers: schema.maybe(schema.arrayOf(schema.string())),
});

export const aggregateRulesResponseBodySchema = schema.object({
  rule_execution_status: schema.recordOf(schema.string(), schema.number()),
  rule_last_run_outcome: schema.recordOf(schema.string(), schema.number()),
  rule_enabled_status: schema.object({
    enabled: schema.number(),
    disabled: schema.number(),
  }),
  rule_muted_status: schema.object({
    muted: schema.number(),
    unmuted: schema.number(),
  }),
  rule_snoozed_status: schema.object({
    snoozed: schema.number(),
  }),
  rule_tags: schema.arrayOf(schema.string()),
});
