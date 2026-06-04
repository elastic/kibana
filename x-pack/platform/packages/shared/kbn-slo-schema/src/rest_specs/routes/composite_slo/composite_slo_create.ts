/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import {
  compositeSloIdSchema,
  compositeTagsSchema,
  compositeTargetSchema,
  compositeOccurrencesBudgetingMethodSchema,
  compositeRollingTimeWindowSchema,
  compositeSloMembersSchema,
  compositeMethodSchema,
} from '../../../schema/composite_slo';

const createCompositeSLOBodySchema = z.object({
  name: z.string(),
  description: z.string(),
  members: compositeSloMembersSchema,
  compositeMethod: compositeMethodSchema,
  timeWindow: compositeRollingTimeWindowSchema,
  budgetingMethod: compositeOccurrencesBudgetingMethodSchema,
  objective: compositeTargetSchema,
  id: compositeSloIdSchema.optional(),
  tags: compositeTagsSchema.optional(),
  enabled: z.boolean().optional(),
});

const createCompositeSLOParamsSchema = z.object({
  body: createCompositeSLOBodySchema,
});

type CreateCompositeSLOInput = z.input<typeof createCompositeSLOBodySchema>;

export { createCompositeSLOParamsSchema };
export type { CreateCompositeSLOInput };
