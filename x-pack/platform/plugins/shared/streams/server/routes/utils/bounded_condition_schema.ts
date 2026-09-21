/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Condition } from '@kbn/streamlang';

// Bounds for HTTP input validation.
// conditionSchema from @kbn/streamlang uses bare z.string() and unbounded
// z.lazy() recursion for and/or/not nesting.
const COND_STR_MAX = 256;
const COND_ARR_MAX = 50;
const COND_DEPTH = 5;

const boundedStringOrNumberOrBoolean = z.union([
  z.string().max(COND_STR_MAX),
  z.number(),
  z.boolean(),
]);

const boundedRangeCondition = z.strictObject({
  gt: boundedStringOrNumberOrBoolean.optional(),
  gte: boundedStringOrNumberOrBoolean.optional(),
  lt: boundedStringOrNumberOrBoolean.optional(),
  lte: boundedStringOrNumberOrBoolean.optional(),
});

// Use strictObject so unknown keys are rejected rather than silently stripped.
const boundedFilterCondition = z.union([
  z.strictObject({
    field: z.string().nonempty().max(COND_STR_MAX),
    eq: boundedStringOrNumberOrBoolean.optional(),
    neq: boundedStringOrNumberOrBoolean.optional(),
    lt: boundedStringOrNumberOrBoolean.optional(),
    lte: boundedStringOrNumberOrBoolean.optional(),
    gt: boundedStringOrNumberOrBoolean.optional(),
    gte: boundedStringOrNumberOrBoolean.optional(),
    contains: boundedStringOrNumberOrBoolean.optional(),
    startsWith: boundedStringOrNumberOrBoolean.optional(),
    endsWith: boundedStringOrNumberOrBoolean.optional(),
    range: boundedRangeCondition.optional(),
    includes: boundedStringOrNumberOrBoolean.optional(),
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
    return z.union([boundedFilterCondition, boundedAlways, boundedNever]) as z.ZodType<Condition>;
  }
  const inner = buildBoundedCondition(depth - 1);
  return z.union([
    boundedFilterCondition,
    z.object({ and: z.array(inner).max(COND_ARR_MAX) }),
    z.object({ or: z.array(inner).max(COND_ARR_MAX) }),
    z.object({ not: inner }),
    boundedAlways,
    boundedNever,
  ]) as z.ZodType<Condition>;
}

export const boundedConditionSchema = buildBoundedCondition(COND_DEPTH);
