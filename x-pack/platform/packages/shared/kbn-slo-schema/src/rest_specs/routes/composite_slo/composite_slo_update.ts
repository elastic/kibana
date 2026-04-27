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

const updateCompositeSLOParamsSchema = z.object({
  path: z.object({
    id: compositeSloIdSchema,
  }),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    members: z.array(compositeSloMemberSchema).min(2).max(25).optional(),
    compositeMethod: compositeMethodSchema.optional(),
    timeWindow: compositeRollingTimeWindowSchema.optional(),
    budgetingMethod: compositeOccurrencesBudgetingMethodSchema.optional(),
    objective: compositeTargetSchema.optional(),
    tags: compositeTagsSchema.optional(),
    enabled: z.boolean().optional(),
  }),
});

const updateCompositeSLOResponseSchema = compositeSloDefinitionSchema;

type UpdateCompositeSLOInput = z.input<typeof updateCompositeSLOParamsSchema.shape.body>;
type UpdateCompositeSLOResponse = z.infer<typeof updateCompositeSLOResponseSchema>;

export { updateCompositeSLOParamsSchema, updateCompositeSLOResponseSchema };
export type { UpdateCompositeSLOInput, UpdateCompositeSLOResponse };
