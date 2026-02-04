/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const durationSchema = schema.object({
  value: schema.number(),
  unit: schema.string(),
});

const windowSchema = schema.object({
  id: schema.string(),
  burnRateThreshold: schema.number(),
  maxBurnRateThreshold: schema.nullable(schema.number()),
  longWindow: durationSchema,
  shortWindow: durationSchema,
  actionGroup: schema.string(),
});

const dependency = schema.object({
  ruleId: schema.string(),
  actionGroupsToSuppressOn: schema.arrayOf(schema.string()),
});

export const sloBurnRateParamsSchema = schema.object({
  sloId: schema.string(),
  windows: schema.arrayOf(windowSchema),
  dependencies: schema.maybe(schema.arrayOf(dependency)),
});
