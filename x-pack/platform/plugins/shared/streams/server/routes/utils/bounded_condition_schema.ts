/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Condition } from '@kbn/streamlang';
import { BINARY_OPERATORS } from '@kbn/streamlang';

// Bounds for HTTP input validation.
// conditionSchema from @kbn/streamlang uses bare z.string() and unbounded
// z.lazy() recursion for and/or/not nesting.
const COND_FIELD_MAX = 256; // field names are identifiers
const COND_VAL_MAX = 65535; // comparison values are arbitrary document values (messages, URLs, …)
const COND_ARR_MAX = 50;
const COND_DEPTH = 5;

// Comparison operands (eq, contains, startsWith, range members, …) can be arbitrary
// document values and need a document-string-sized bound, not an identifier-sized one.
const boundedStringOrNumberOrBoolean = z.union([
  z.string().max(COND_VAL_MAX),
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
// The binary arm mirrors shorthandBinaryFilterConditionSchema's .refine() so that
// { field: "x" } (no operator) is not accepted as binary — it must fall through to unary.
const boundedFilterCondition = z.union([
  z
    .strictObject({
      field: z.string().nonempty().max(COND_FIELD_MAX),
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
    })
    .refine((obj) => Object.keys(obj).some((key) => BINARY_OPERATORS.includes(key as never)), {
      message: 'At least one operator must be specified',
    }),
  z.strictObject({
    field: z.string().nonempty().max(COND_FIELD_MAX),
    exists: z.boolean().optional(),
  }),
]);

const boundedAlways = z.strictObject({ always: z.strictObject({}) });
const boundedNever = z.strictObject({ never: z.strictObject({}) });

function buildBoundedCondition(depth: number): z.ZodType<Condition> {
  if (depth === 0) {
    return z.union([boundedFilterCondition, boundedAlways, boundedNever]) as z.ZodType<Condition>;
  }
  const inner = buildBoundedCondition(depth - 1);
  return z.union([
    boundedFilterCondition,
    z.strictObject({ and: z.array(inner).max(COND_ARR_MAX) }),
    z.strictObject({ or: z.array(inner).max(COND_ARR_MAX) }),
    z.strictObject({ not: inner }),
    boundedAlways,
    boundedNever,
  ]) as z.ZodType<Condition>;
}

export const boundedConditionSchema = buildBoundedCondition(COND_DEPTH);
