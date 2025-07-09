/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '@kbn/streams-schema';

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

export interface ShorthandBinaryFilterCondition {
  field: string;
  eq?: string | number | boolean;
  neq?: string | number | boolean;
  lt?: string | number | boolean;
  lte?: string | number | boolean;
  gt?: string | number | boolean;
  gte?: string | number | boolean;
  contains?: string | number | boolean;
  startsWith?: string | number | boolean;
  endsWith?: string | number | boolean;
}

// Shorthand binary: field + one of the operator keys
export const shorthandBinaryFilterConditionSchema = z
  .object({
    field: NonEmptyString,
    eq: stringOrNumberOrBoolean.optional(),
    neq: stringOrNumberOrBoolean.optional(),
    lt: stringOrNumberOrBoolean.optional(),
    lte: stringOrNumberOrBoolean.optional(),
    gt: stringOrNumberOrBoolean.optional(),
    gte: stringOrNumberOrBoolean.optional(),
    contains: stringOrNumberOrBoolean.optional(),
    startsWith: stringOrNumberOrBoolean.optional(),
    endsWith: stringOrNumberOrBoolean.optional(),
  })
  .refine(
    (obj) =>
      // At least one operator must be present
      Object.keys(obj).some((key) =>
        ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith'].includes(key)
      ),
    { message: 'At least one operator must be specified' }
  );

export interface ShorthandUnaryFilterCondition {
  field: string;
  exists?: true;
  notExists?: true;
}

// Shorthand unary: field + exists or notExists
export const shorthandUnaryFilterConditionSchema = z
  .object({
    field: NonEmptyString,
    exists: z.literal(true).optional(),
    notExists: z.literal(true).optional(),
  })
  .refine((obj) => obj.exists === true || obj.notExists === true, {
    message: 'Must specify exists: true or notExists: true',
  });

export type FilterCondition = ShorthandBinaryFilterCondition | ShorthandUnaryFilterCondition;

export const filterConditionSchema = z.union([
  shorthandBinaryFilterConditionSchema,
  shorthandUnaryFilterConditionSchema,
]);

export interface AndCondition {
  and: Condition[];
}

export interface OrCondition {
  or: Condition[];
}

export interface AlwaysCondition {
  always: {};
}

export interface NeverCondition {
  never: {};
}

export type Condition =
  | FilterCondition
  | AndCondition
  | OrCondition
  | NeverCondition
  | AlwaysCondition;

export const conditionSchema: z.Schema<Condition> = z.lazy(() =>
  z.union([
    filterConditionSchema,
    andConditionSchema,
    orConditionSchema,
    neverConditionSchema,
    alwaysConditionSchema,
  ])
);

export const andConditionSchema = z.object({ and: z.array(conditionSchema) });
export const orConditionSchema = z.object({ or: z.array(conditionSchema) });
export const neverConditionSchema = z.object({ never: z.strictObject({}) });
export const alwaysConditionSchema = z.object({ always: z.strictObject({}) });

export const isBinaryFilterCondition = createIsNarrowSchema(
  conditionSchema,
  shorthandBinaryFilterConditionSchema
);
export const isUnaryFilterCondition = createIsNarrowSchema(
  conditionSchema,
  shorthandUnaryFilterConditionSchema
);
export const isFilterCondition = createIsNarrowSchema(conditionSchema, filterConditionSchema);

export const isAndCondition = createIsNarrowSchema(conditionSchema, andConditionSchema);
export const isOrCondition = createIsNarrowSchema(conditionSchema, orConditionSchema);
export const isNeverCondition = createIsNarrowSchema(conditionSchema, neverConditionSchema);
export const isAlwaysCondition = createIsNarrowSchema(conditionSchema, alwaysConditionSchema);

export const isCondition = createIsNarrowSchema(z.unknown(), conditionSchema);
