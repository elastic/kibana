/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getRuleIdsWithGapsParamsSchema = schema.object({
  start: schema.string(),
  end: schema.string(),
  statuses: schema.maybe(schema.arrayOf(schema.string())),
});

export const getRuleIdsWithGapsResponseSchema = schema.object({
  total: schema.number(),
  ruleIds: schema.arrayOf(schema.string()),
});
