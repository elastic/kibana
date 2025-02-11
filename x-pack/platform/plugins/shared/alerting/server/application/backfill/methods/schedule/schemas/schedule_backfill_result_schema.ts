/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { backfillSchema } from '../../../result/schemas';

export const scheduleBackfillErrorSchema = schema.object({
  error: schema.object({
    message: schema.string(),
    status: schema.maybe(schema.number()),
    rule: schema.object({
      id: schema.string(),
      name: schema.maybe(schema.string()),
    }),
  }),
});

export const scheduleBackfillResultSchema = schema.oneOf([
  backfillSchema,
  scheduleBackfillErrorSchema,
]);
export const scheduleBackfillResultsSchema = schema.arrayOf(scheduleBackfillResultSchema);
