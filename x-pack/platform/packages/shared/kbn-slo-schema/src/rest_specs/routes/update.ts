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
  sloDefinitionSchema,
  sloIdSchema,
  tagsSchema,
} from '../../schema/slo';
import { timeWindowSchema } from '../../schema/time_window';

const updateSLOParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      id: sloIdSchema,
    }),
    body: z.object({
      name: z.string().optional().describe('A name for the SLO.'),
      description: z.string().optional().describe('A description for the SLO.'),
      indicator: indicatorSchema.optional(),
      timeWindow: timeWindowSchema.optional(),
      budgetingMethod: budgetingMethodSchema.optional(),
      objective: objectiveSchema.optional(),
      settings: optionalSettingsSchema.optional().describe('Defines properties for SLO settings.'),
      tags: tagsSchema.optional(),
      groupBy: groupBySchema.optional(),
      artifacts: artifactsWithIdSchema.optional(),
    }),
  })
);

const updateSLOResponseSchema = sloDefinitionSchema;

type UpdateSLOInput = z.input<typeof updateSLOParamsSchema.shape.body>;
type UpdateSLOParams = z.output<typeof updateSLOParamsSchema.shape.body>;
type UpdateSLOResponse = z.input<typeof updateSLOResponseSchema>;

export { updateSLOParamsSchema, updateSLOResponseSchema };
export type { UpdateSLOInput, UpdateSLOParams, UpdateSLOResponse };
