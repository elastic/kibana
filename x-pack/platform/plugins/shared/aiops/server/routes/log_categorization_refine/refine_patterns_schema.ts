/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const categoryItemSchema = schema.object({
  key: schema.string(),
  count: schema.number(),
  examples: schema.arrayOf(schema.string()),
});

export const refinePatternsBodySchema = schema.object({
  categories: schema.arrayOf(categoryItemSchema, { minSize: 1 }),
  connectorId: schema.string(),
  fieldName: schema.maybe(schema.string()),
});

export type RefinePatternsBodySchema = TypeOf<typeof refinePatternsBodySchema>;
