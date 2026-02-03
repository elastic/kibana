/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { stringOrStringArraySchema } from '../../../../../../schemas';
import { ruleResponseSchemaV1 } from '../../../../response';

export const findRulesInternalRequestBodySchema = schema.object({
  per_page: schema.number({
    defaultValue: 10,
    min: 0,
  }),
  page: schema.number({
    defaultValue: 1,
    min: 1,
  }),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(stringOrStringArraySchema()),
  sort_field: schema.maybe(schema.string()),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
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
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
  rule_type_ids: schema.maybe(schema.arrayOf(schema.string())),
  consumers: schema.maybe(schema.arrayOf(schema.string())),
});

const findRulesInternalResponseDataSchema = schema.arrayOf(ruleResponseSchemaV1.extends({}));

export const findRulesInternalResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: findRulesInternalResponseDataSchema,
});
