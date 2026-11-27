/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import { SLI_RETENTION_MAX_PERIOD_DAYS, SLI_RETENTION_MIN_PERIOD_DAYS } from '@kbn/slo-constants';
import { dateType } from './common';

const sliRetentionSchema = lazySchema(() =>
  z.object({
    enabled: z
      .boolean()
      .describe('Indicates if dated SLI indices older than the retention period are deleted'),
    periodDays: z
      .number()
      .int()
      .min(SLI_RETENTION_MIN_PERIOD_DAYS)
      .max(SLI_RETENTION_MAX_PERIOD_DAYS)
      .describe('The number of days of SLI data kept when SLI retention is enabled'),
  })
);

// The setting blocks a caller writes; the bounds apply here, at the input edge.
const sloGlobalSettingsUpdateSchema = lazySchema(() =>
  z.object({
    sliRetention: sliRetentionSchema.optional(),
  })
);

// The stored setting blocks, each with the date it was last written. Shape only: a value
// stored under older bounds must still be read after the bounds change.
const sloGlobalSettingsSchema = lazySchema(() =>
  z.object({
    sliRetention: sliRetentionSchema
      .extend({ periodDays: z.number().int().positive(), updatedAt: dateType })
      .optional(),
  })
);

export { sliRetentionSchema, sloGlobalSettingsSchema, sloGlobalSettingsUpdateSchema };
