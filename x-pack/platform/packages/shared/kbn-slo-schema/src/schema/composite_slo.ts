/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

const COMPOSITE_SLO_MIN_MEMBERS = 2;
const COMPOSITE_SLO_MAX_MEMBERS = 25;

const compositeSloIdSchema = lazySchema(() =>
  z
    .string()
    .min(8)
    .max(48)
    .regex(
      /^[a-z0-9-_]+$/,
      'Invalid slo id, must be between 8 and 48 characters and contain only letters, numbers, hyphens, and underscores'
    )
);

const compositeTagsSchema = lazySchema(() => z.array(z.string()).max(30));

const compositeTargetSchema = lazySchema(() => z.object({ target: z.number() }));

const compositeOccurrencesBudgetingMethodSchema = lazySchema(() => z.literal('occurrences'));

const compositeRollingTimeWindowSchema = lazySchema(() =>
  z.object({
    duration: z.string(),
    type: z.literal('rolling'),
  })
);

const compositeSloMemberSchema = lazySchema(() =>
  z.object({
    sloId: compositeSloIdSchema,
    weight: z.number().int().positive(),
    instanceId: z.string().optional(),
  })
);

const compositeSloMembersSchema = lazySchema(() =>
  z
    .array(compositeSloMemberSchema)
    .min(COMPOSITE_SLO_MIN_MEMBERS)
    .max(COMPOSITE_SLO_MAX_MEMBERS)
    .refine(
      (members) => {
        const keys = members.map(({ sloId, instanceId }) => `${sloId}:${instanceId ?? ''}`);
        return new Set(keys).size === keys.length;
      },
      { message: 'Composite SLO members must be unique by sloId and instanceId' }
    )
);

const compositeMethodSchema = lazySchema(() => z.literal('weightedAverage'));

const compositeErrorBudgetSchema = lazySchema(() =>
  z.object({
    initial: z.number(),
    consumed: z.number(),
    remaining: z.number(),
    isEstimated: z.boolean(),
  })
);

const compositeStatusSchema = lazySchema(() =>
  z.union([
    z.literal('NO_DATA'),
    z.literal('HEALTHY'),
    z.literal('DEGRADING'),
    z.literal('VIOLATED'),
  ])
);

const compositeSloBaseDefinitionSchema = lazySchema(() =>
  z.object({
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
  })
);

const compositeSloDefinitionSchema = lazySchema(() =>
  compositeSloBaseDefinitionSchema.extend({
    members: z
      .array(compositeSloMemberSchema)
      .min(COMPOSITE_SLO_MIN_MEMBERS)
      .max(COMPOSITE_SLO_MAX_MEMBERS),
  })
);

const storedCompositeSloDefinitionSchema = compositeSloDefinitionSchema;

// A member summary extends the plain definition member (`sloId`, `weight`, `instanceId`)
// with the computed per-member health, so a `CompositeSLOMemberWithSummary` is assignable to
// a `CompositeSLOMember`.
const compositeSloMemberWithSummarySchema = lazySchema(() =>
  compositeSloMemberSchema.extend({
    name: z.string(),
    normalisedWeight: z.number(),
    sliValue: z.number(),
    status: compositeStatusSchema,
    errorBudget: compositeErrorBudgetSchema.optional(),
    fiveMinuteBurnRate: z.number().optional(),
    oneHourBurnRate: z.number().optional(),
    oneDayBurnRate: z.number().optional(),
  })
);

const compositeSloSummarySchema = lazySchema(() =>
  z.object({
    sliValue: z.number(),
    errorBudget: compositeErrorBudgetSchema,
    status: compositeStatusSchema,
    fiveMinuteBurnRate: z.number(),
    oneHourBurnRate: z.number(),
    oneDayBurnRate: z.number(),
  })
);

const compositeSloDefinitionResponseSchema = compositeSloDefinitionSchema;

// The summary response strictly extends the definition response: it keeps every definition
// field (including `members`, now widened to member summaries) and adds the composite `summary`.
const compositeSloWithSummaryResponseSchema = lazySchema(() =>
  compositeSloDefinitionSchema.extend({
    summary: compositeSloSummarySchema,
    members: z.array(compositeSloMemberWithSummarySchema),
  })
);

type CompositeSLOMemberWithSummary = z.infer<typeof compositeSloMemberWithSummarySchema>;
type CompositeSLOSummary = z.infer<typeof compositeSloSummarySchema>;
type CompositeSLODefinitionResponse = z.infer<typeof compositeSloDefinitionResponseSchema>;
type CompositeSLOWithSummaryResponse = z.infer<typeof compositeSloWithSummaryResponseSchema>;

export type {
  CompositeSLOMemberWithSummary,
  CompositeSLOSummary,
  CompositeSLODefinitionResponse,
  CompositeSLOWithSummaryResponse,
};

export {
  COMPOSITE_SLO_MIN_MEMBERS,
  COMPOSITE_SLO_MAX_MEMBERS,
  compositeSloIdSchema,
  compositeTagsSchema,
  compositeTargetSchema,
  compositeOccurrencesBudgetingMethodSchema,
  compositeRollingTimeWindowSchema,
  compositeSloMemberSchema,
  compositeSloMembersSchema,
  compositeMethodSchema,
  compositeErrorBudgetSchema,
  compositeStatusSchema,
  compositeSloBaseDefinitionSchema,
  compositeSloDefinitionSchema,
  storedCompositeSloDefinitionSchema,
  compositeSloMemberWithSummarySchema,
  compositeSloSummarySchema,
  compositeSloDefinitionResponseSchema,
  compositeSloWithSummaryResponseSchema,
};
