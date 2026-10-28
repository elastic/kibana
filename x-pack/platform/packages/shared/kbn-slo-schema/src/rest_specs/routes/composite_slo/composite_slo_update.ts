/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';
import {
  compositeSloIdSchema,
  compositeTagsSchema,
  compositeTargetSchema,
  compositeOccurrencesBudgetingMethodSchema,
  compositeRollingTimeWindowSchema,
  compositeSloMembersSchema,
  compositeMethodSchema,
} from '../../../schema/composite_slo';

const updateCompositeSLOBodySchema = lazySchema(() =>
  z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    members: compositeSloMembersSchema.optional(),
    compositeMethod: compositeMethodSchema.optional(),
    timeWindow: compositeRollingTimeWindowSchema.optional(),
    budgetingMethod: compositeOccurrencesBudgetingMethodSchema.optional(),
    objective: compositeTargetSchema.optional(),
    tags: compositeTagsSchema.optional(),
    enabled: z.boolean().optional(),
  })
);

const updateCompositeSLOParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      id: compositeSloIdSchema,
    }),
    body: updateCompositeSLOBodySchema,
  })
);

const updateCompositeSLOInputSchema = lazySchema(() =>
  updateCompositeSLOBodySchema.extend({
    id: compositeSloIdSchema,
    spaceId: z.string(),
    userId: z.string(),
  })
);

type UpdateCompositeSLOInput = z.input<typeof updateCompositeSLOInputSchema>;

export type { UpdateCompositeSLOInput };
export { updateCompositeSLOParamsSchema };
