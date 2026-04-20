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
  compositeSloMemberSchema,
  compositeMethodSchema,
  compositeSloDefinitionSchema,
} from '../../../schema/composite_slo';

const createCompositeSLOBodySchema = z.object({
  name: z.string(),
  description: z.string(),
  members: z.array(compositeSloMemberSchema).min(2).max(25),
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

const createCompositeSLOResponseSchema = compositeSloDefinitionSchema;

type CreateCompositeSLOInput = z.input<typeof createCompositeSLOBodySchema>;
type CreateCompositeSLOResponse = z.infer<typeof createCompositeSLOResponseSchema>;

export { createCompositeSLOParamsSchema, createCompositeSLOResponseSchema };
export type { CreateCompositeSLOInput, CreateCompositeSLOResponse };
