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

type StringOrNumberOrBoolean = string | number | boolean;

type OperatorKey = keyof Omit<ShorthandBinaryFilterCondition, 'field'>;

export const OPERATORS: OperatorKey[] = [
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'startsWith',
  'endsWith',
  'range',
];

export interface RangeCondition {
  gt?: StringOrNumberOrBoolean;
  gte?: StringOrNumberOrBoolean;
  lt?: StringOrNumberOrBoolean;
  lte?: StringOrNumberOrBoolean;
}
export interface ShorthandBinaryFilterCondition {
  field: string;
  eq?: StringOrNumberOrBoolean;
  neq?: StringOrNumberOrBoolean;
  lt?: StringOrNumberOrBoolean;
  lte?: StringOrNumberOrBoolean;
  gt?: StringOrNumberOrBoolean;
  gte?: StringOrNumberOrBoolean;
  contains?: StringOrNumberOrBoolean;
  startsWith?: StringOrNumberOrBoolean;
  endsWith?: StringOrNumberOrBoolean;
  range?: RangeCondition;
}

export const rangeConditionSchema = z.object({
  gt: stringOrNumberOrBoolean.optional(),
  gte: stringOrNumberOrBoolean.optional(),
  lt: stringOrNumberOrBoolean.optional(),
  lte: stringOrNumberOrBoolean.optional(),
});
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
    range: rangeConditionSchema.optional(),
  })
  .refine(
    (obj) =>
      // At least one operator must be present
      Object.keys(obj).some((key) => OPERATORS.includes(key as OperatorKey)),
    { message: 'At least one operator must be specified' }
  );

export interface ShorthandUnaryFilterCondition {
  field: string;
  exists?: boolean;
}

// Shorthand unary
export const shorthandUnaryFilterConditionSchema = z.object({
  field: NonEmptyString,
  exists: z.boolean().optional(),
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

export interface NotCondition {
  not: Condition;
}

export type Condition =
  | FilterCondition
  | AndCondition
  | OrCondition
  | NotCondition
  | NeverCondition
  | AlwaysCondition;

export const conditionSchema: z.Schema<Condition> = z.lazy(() =>
  z.union([
    filterConditionSchema,
    andConditionSchema,
    orConditionSchema,
    notConditionSchema,
    neverConditionSchema,
    alwaysConditionSchema,
  ])
);

export const andConditionSchema = z.object({ and: z.array(conditionSchema) });
export const orConditionSchema = z.object({ or: z.array(conditionSchema) });
export const neverConditionSchema = z.object({ never: z.strictObject({}) });
export const alwaysConditionSchema = z.object({ always: z.strictObject({}) });
export const notConditionSchema = z.object({ not: z.lazy(() => conditionSchema) });

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
export const isNotCondition = createIsNarrowSchema(conditionSchema, notConditionSchema);

export const isCondition = createIsNarrowSchema(z.unknown(), conditionSchema);
