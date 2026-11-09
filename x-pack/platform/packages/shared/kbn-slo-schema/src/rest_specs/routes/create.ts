/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';
import { indicatorSchema } from '../../schema/indicators';
import {
  artifactsWithIdSchema,
  budgetingMethodSchema,
  groupBySchema,
  objectiveSchema,
  optionalSettingsSchema,
  sloIdSchema,
  tagsSchema,
} from '../../schema/slo';
import { timeWindowSchema } from '../../schema/time_window';

const createSLOParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      name: z.string().describe('A name for the SLO.'),
      description: z.string().describe('A description for the SLO.'),
      indicator: indicatorSchema,
      timeWindow: timeWindowSchema,
      budgetingMethod: budgetingMethodSchema,
      objective: objectiveSchema,
      id: sloIdSchema.optional(),
      settings: optionalSettingsSchema.optional().describe('Defines properties for SLO settings.'),
      tags: tagsSchema.optional(),
      groupBy: groupBySchema.optional(),
      revision: z.number().optional(),
      artifacts: artifactsWithIdSchema.optional(),
    }),
  })
);

const createSLOResponseSchema = z.object({
  id: sloIdSchema,
});

type CreateSLOInput = z.input<typeof createSLOParamsSchema.shape.body>;
type CreateSLOParams = z.output<typeof createSLOParamsSchema.shape.body>;
type CreateSLOResponse = z.output<typeof createSLOResponseSchema>;

export { createSLOParamsSchema, createSLOResponseSchema };
export type { CreateSLOInput, CreateSLOParams, CreateSLOResponse };
