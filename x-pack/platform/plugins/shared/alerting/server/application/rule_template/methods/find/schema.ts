/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const findRuleTemplatesParamsSchema = schema.object({
  perPage: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  search: schema.maybe(schema.string()),
  defaultSearchOperator: schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')])),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  ruleTypeId: schema.maybe(schema.string()),
  tags: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10 })),
});
