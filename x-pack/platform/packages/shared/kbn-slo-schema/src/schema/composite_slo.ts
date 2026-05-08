/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const compositeSloIdSchema = z
  .string()
  .min(8)
  .max(48)
  .regex(
    /^[a-z0-9-_]+$/,
    'Invalid slo id, must be between 8 and 48 characters and contain only letters, numbers, hyphens, and underscores'
  );

const compositeTagsSchema = z.array(z.string()).max(30);

const compositeTargetSchema = z.object({ target: z.number() });

const compositeOccurrencesBudgetingMethodSchema = z.literal('occurrences');

const compositeRollingTimeWindowSchema = z.object({
  duration: z.string(),
  type: z.literal('rolling'),
});

const compositeSloMemberSchema = z.object({
  sloId: compositeSloIdSchema,
  weight: z.number(),
  instanceId: z.string().optional(),
});

const compositeMethodSchema = z.literal('weightedAverage');

const compositeErrorBudgetSchema = z.object({
  initial: z.number(),
  consumed: z.number(),
  remaining: z.number(),
  isEstimated: z.boolean(),
});

const compositeStatusSchema = z.union([
  z.literal('NO_DATA'),
  z.literal('HEALTHY'),
  z.literal('DEGRADING'),
  z.literal('VIOLATED'),
]);

const compositeSloBaseDefinitionSchema = z.object({
  id: compositeSloIdSchema,
  name: z.string(),
  description: z.string(),
  compositeMethod: compositeMethodSchema,
  timeWindow: compositeRollingTimeWindowSchema,
  budgetingMethod: compositeOccurrencesBudgetingMethodSchema,
  objective: compositeTargetSchema,
  tags: compositeTagsSchema,
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
  version: z.number(),
});

const compositeSloDefinitionSchema = compositeSloBaseDefinitionSchema.extend({
  members: z.array(compositeSloMemberSchema).min(2).max(25),
});

const storedCompositeSloDefinitionSchema = compositeSloDefinitionSchema;

const compositeSloMemberSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
  normalisedWeight: z.number(),
  sliValue: z.number(),
  contribution: z.number(),
  status: compositeStatusSchema,
  instanceId: z.string().optional(),
});

const compositeSloSummarySchema = z.object({
  sliValue: z.number(),
  errorBudget: compositeErrorBudgetSchema,
  status: compositeStatusSchema,
  fiveMinuteBurnRate: z.number(),
  oneHourBurnRate: z.number(),
  oneDayBurnRate: z.number(),
});

type CompositeSLOMember = z.infer<typeof compositeSloMemberSchema>;
type CompositeMethod = z.infer<typeof compositeMethodSchema>;
type CompositeSLOMemberSummary = z.infer<typeof compositeSloMemberSummarySchema>;
type CompositeSLOSummary = z.infer<typeof compositeSloSummarySchema>;

export type { CompositeSLOMember, CompositeMethod, CompositeSLOMemberSummary, CompositeSLOSummary };

export {
  compositeSloIdSchema,
  compositeTagsSchema,
  compositeTargetSchema,
  compositeOccurrencesBudgetingMethodSchema,
  compositeRollingTimeWindowSchema,
  compositeSloMemberSchema,
  compositeMethodSchema,
  compositeErrorBudgetSchema,
  compositeStatusSchema,
  compositeSloBaseDefinitionSchema,
  compositeSloDefinitionSchema,
  storedCompositeSloDefinitionSchema,
  compositeSloMemberSummarySchema,
  compositeSloSummarySchema,
};
