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

const createCompositeSLOBodySchema = lazySchema(() =>
  z.object({
    name: displayName(),
    description: description(),
    members: compositeSloMembersSchema,
    compositeMethod: compositeMethodSchema,
    timeWindow: compositeRollingTimeWindowSchema,
    budgetingMethod: occurrencesBudgetingMethodSchema,
    objective: targetSchema,
    id: sloIdSchema.optional(),
    tags: compositeTagsSchema.optional(),
    enabled: z.boolean().optional(),
  })
);

const createCompositeSLOParamsSchema = z.object({
  body: createCompositeSLOBodySchema,
});

type CreateCompositeSLOInput = z.input<typeof createCompositeSLOBodySchema>;

export { createCompositeSLOParamsSchema };
export type { CreateCompositeSLOInput };
