/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { z } from '@kbn/zod/v4';
import { createIsNarrowSchema, NonEmptyString } from '@kbn/zod-helpers/v4';
import { MAX_STREAM_NAME_LENGTH } from '../../../helpers/stream_name_validation';

export const routingStatus = z.enum(['enabled', 'disabled']);
export type RoutingStatus = z.infer<typeof routingStatus>;

export interface RoutingDefinition {
  destination: string;
  where: Condition;
  status?: RoutingStatus;
  draft?: boolean;
}

// Bounded condition schema for routing definitions accepted over HTTP.
// conditionSchema from @kbn/streamlang uses bare z.string() and unbounded
// z.lazy() recursion; this caps strings, array counts, and nesting depth.
const COND_STR_MAX = 256;
const COND_ARR_MAX = 50;
const COND_DEPTH = 5;

const boundedSNB = z.union([z.string().max(COND_STR_MAX), z.number(), z.boolean()]);
const boundedRange = z.strictObject({
  gt: boundedSNB.optional(),
  gte: boundedSNB.optional(),
  lt: boundedSNB.optional(),
  lte: boundedSNB.optional(),
});
const boundedFilter = z.union([
  z.strictObject({
    field: z.string().nonempty().max(COND_STR_MAX),
    eq: boundedSNB.optional(),
    neq: boundedSNB.optional(),
    lt: boundedSNB.optional(),
    lte: boundedSNB.optional(),
    gt: boundedSNB.optional(),
    gte: boundedSNB.optional(),
    contains: boundedSNB.optional(),
    startsWith: boundedSNB.optional(),
    endsWith: boundedSNB.optional(),
    range: boundedRange.optional(),
    includes: boundedSNB.optional(),
  }),
  z.strictObject({
    field: z.string().nonempty().max(COND_STR_MAX),
    exists: z.boolean().optional(),
  }),
]);
const boundedAlways = z.object({ always: z.object({}) });
const boundedNever = z.object({ never: z.object({}) });

function buildBoundedCondition(depth: number): z.ZodType<Condition> {
  if (depth === 0) {
    return z.union([boundedFilter, boundedAlways, boundedNever]) as z.ZodType<Condition>;
  }
  const inner = buildBoundedCondition(depth - 1);
  return z.union([
    boundedFilter,
    z.strictObject({ and: z.array(inner).max(COND_ARR_MAX) }),
    z.strictObject({ or: z.array(inner).max(COND_ARR_MAX) }),
    z.strictObject({ not: inner }),
    boundedAlways,
    boundedNever,
  ]) as z.ZodType<Condition>;
}

const boundedCondition = buildBoundedCondition(COND_DEPTH);

export const routingDefinitionSchema: z.Schema<RoutingDefinition> = z.object({
  destination: NonEmptyString.max(MAX_STREAM_NAME_LENGTH),
  where: boundedCondition,
  status: routingStatus.optional(),
  draft: z.boolean().optional(),
});

export const routingDefinitionListSchema: z.Schema<RoutingDefinition[]> = z
  .array(routingDefinitionSchema)
  .max(200);

export const isRoutingEnabled = createIsNarrowSchema(routingStatus, z.literal('enabled'));
