/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import { dateType, errorBudgetSchema, statusSchema } from './common';
import { durationType } from './duration';
import { occurrencesBudgetingMethodSchema, sloIdSchema, targetSchema } from './slo';
import { rollingTimeWindowTypeSchema } from './time_window';

const COMPOSITE_SLO_MIN_MEMBERS = 2;
const COMPOSITE_SLO_MAX_MEMBERS = 25;

const compositeTagsSchema = z.array(z.string()).max(30);

const compositeRollingTimeWindowSchema = lazySchema(() =>
  z.object({
    duration: durationType.describe(
      'The rolling duration formatted as {duration}{unit}, for example 30d'
    ),
    type: rollingTimeWindowTypeSchema,
  })
);

const compositeSloMemberSchema = lazySchema(() =>
  z.object({
    sloId: sloIdSchema,
    weight: z.number().int().positive(),
    instanceId: z.string().optional(),
  })
);

const compositeSloMembersSchema = z
  .array(compositeSloMemberSchema)
  .min(COMPOSITE_SLO_MIN_MEMBERS)
  .max(COMPOSITE_SLO_MAX_MEMBERS)
  .refine(
    (members) => {
      const keys = members.map(({ sloId, instanceId }) => `${sloId}:${instanceId ?? ''}`);
      return new Set(keys).size === keys.length;
    },
    { message: 'Composite SLO members must be unique by sloId and instanceId' }
  );

const compositeMethodSchema = z.literal('weightedAverage');

const compositeSloBaseDefinitionSchema = lazySchema(() =>
  z.object({
    id: sloIdSchema,
    name: z.string(),
    description: z.string(),
    compositeMethod: compositeMethodSchema,
    timeWindow: compositeRollingTimeWindowSchema,
    budgetingMethod: occurrencesBudgetingMethodSchema,
    objective: targetSchema,
    tags: compositeTagsSchema,
    enabled: z.boolean(),
    createdAt: dateType,
    updatedAt: dateType,
    createdBy: z.string(),
    updatedBy: z.string(),
    version: z.number(),
  })
);

const compositeSloDefinitionSchema = compositeSloBaseDefinitionSchema.extend({
  members: z
    .array(compositeSloMemberSchema)
    .min(COMPOSITE_SLO_MIN_MEMBERS)
    .max(COMPOSITE_SLO_MAX_MEMBERS),
});

const storedCompositeSloDefinitionSchema = compositeSloDefinitionSchema;

// A member summary extends the plain definition member (`sloId`, `weight`, `instanceId`)
// with the computed per-member health, so a `CompositeSLOMemberWithSummary` is assignable to
// a `CompositeSLOMember`.
const compositeSloMemberWithSummarySchema = lazySchema(() =>
  compositeSloMemberSchema.extend({
    name: z.string(),
    normalisedWeight: z.number(),
    sliValue: z.number(),
    status: statusSchema,
    errorBudget: errorBudgetSchema.optional(),
    fiveMinuteBurnRate: z.number().optional(),
    oneHourBurnRate: z.number().optional(),
    oneDayBurnRate: z.number().optional(),
  })
);

const compositeSloSummarySchema = lazySchema(() =>
  z.object({
    sliValue: z.number(),
    errorBudget: errorBudgetSchema,
    status: statusSchema,
    fiveMinuteBurnRate: z.number(),
    oneHourBurnRate: z.number(),
    oneDayBurnRate: z.number(),
  })
);

const compositeSloDefinitionResponseSchema = compositeSloDefinitionSchema;

// The summary response strictly extends the definition response: it keeps every definition
// field (including `members`, now widened to member summaries) and adds the composite `summary`.
const compositeSloWithSummaryResponseSchema = compositeSloDefinitionSchema.extend({
  summary: compositeSloSummarySchema,
  members: z.array(compositeSloMemberWithSummarySchema),
});

type CompositeSLOMemberWithSummary = z.infer<typeof compositeSloMemberWithSummarySchema>;
type CompositeSLOSummary = z.infer<typeof compositeSloSummarySchema>;
type CompositeSLODefinitionResponse = z.input<typeof compositeSloDefinitionResponseSchema>;
type CompositeSLOWithSummaryResponse = z.input<typeof compositeSloWithSummaryResponseSchema>;

export type {
  CompositeSLOMemberWithSummary,
  CompositeSLOSummary,
  CompositeSLODefinitionResponse,
  CompositeSLOWithSummaryResponse,
};

export {
  COMPOSITE_SLO_MIN_MEMBERS,
  COMPOSITE_SLO_MAX_MEMBERS,
  compositeTagsSchema,
  compositeRollingTimeWindowSchema,
  compositeSloMemberSchema,
  compositeSloMembersSchema,
  compositeMethodSchema,
  compositeSloBaseDefinitionSchema,
  compositeSloDefinitionSchema,
  storedCompositeSloDefinitionSchema,
  compositeSloMemberWithSummarySchema,
  compositeSloSummarySchema,
  compositeSloDefinitionResponseSchema,
  compositeSloWithSummaryResponseSchema,
};
