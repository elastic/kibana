/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { indicatorSchema } from './indicators';
import {
  budgetingMethodSchema,
  dashboardsWithIdSchema,
  objectiveSchema,
  optionalSettingsSchema,
  tagsSchema,
} from './slo';
import { timeWindowSchema } from './time_window';

const sloTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  indicator: indicatorSchema.optional(),
  budgetingMethod: budgetingMethodSchema.optional(),
  objective: objectiveSchema.optional(),
  timeWindow: timeWindowSchema.optional(),
  tags: tagsSchema.optional(),
  settings: optionalSettingsSchema.optional(),
  groupBy: z.array(z.string()).optional(),
  artifacts: dashboardsWithIdSchema.optional(),
});

// Permissive catch-all — integrations may push arbitrary data into the stored object
const storedSloTemplateSchema = z.record(z.string(), z.unknown());

export { sloTemplateSchema, storedSloTemplateSchema };
