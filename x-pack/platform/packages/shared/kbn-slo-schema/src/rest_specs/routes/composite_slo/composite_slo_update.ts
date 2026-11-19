/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, displayName, description, lazySchema } from '@kbn/zod';
import {
  compositeTagsSchema,
  compositeRollingTimeWindowSchema,
  compositeSloMembersSchema,
  compositeMethodSchema,
} from '../../../schema/composite_slo';
import { occurrencesBudgetingMethodSchema, sloIdSchema, targetSchema } from '../../../schema/slo';

const updateCompositeSLOBodySchema = lazySchema(() =>
  z.object({
    name: displayName().optional(),
    description: description().optional(),
    members: compositeSloMembersSchema.optional(),
    compositeMethod: compositeMethodSchema.optional(),
    timeWindow: compositeRollingTimeWindowSchema.optional(),
    budgetingMethod: occurrencesBudgetingMethodSchema.optional(),
    objective: targetSchema.optional(),
    tags: compositeTagsSchema.optional(),
    enabled: z.boolean().optional(),
  })
);

const updateCompositeSLOParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      id: sloIdSchema,
    }),
    body: updateCompositeSLOBodySchema,
  })
);

const updateCompositeSLOInputSchema = lazySchema(() =>
  updateCompositeSLOBodySchema.extend({
    id: sloIdSchema,
    spaceId: z.string(),
    userId: z.string(),
  })
);

type UpdateCompositeSLOInput = z.input<typeof updateCompositeSLOInputSchema>;

export type { UpdateCompositeSLOInput };
export { updateCompositeSLOParamsSchema };
