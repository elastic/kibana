/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '../shared/type_guards';

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

export type BinaryOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

export type UnaryOperator = 'exists' | 'notExists';

export interface BinaryFilterCondition {
  field: string;
  operator: BinaryOperator;
  value: string | number | boolean;
}

export interface UnaryFilterCondition {
  field: string;
  operator: UnaryOperator;
}

export const binaryFilterConditionSchema: z.Schema<BinaryFilterCondition> = z.object({
  field: NonEmptyString,
  operator: z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith']),
  value: stringOrNumberOrBoolean,
});

export const unaryFilterConditionSchema: z.Schema<UnaryFilterCondition> = z.object({
  field: NonEmptyString,
  operator: z.enum(['exists', 'notExists']),
});

export const filterConditionSchema = z.union([
  unaryFilterConditionSchema,
  binaryFilterConditionSchema,
]);

export type FilterCondition = BinaryFilterCondition | UnaryFilterCondition;

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
  binaryFilterConditionSchema
);
export const isUnaryFilterCondition = createIsNarrowSchema(
  conditionSchema,
  unaryFilterConditionSchema
);
export const isFilterCondition = createIsNarrowSchema(conditionSchema, filterConditionSchema);

export const isAndCondition = createIsNarrowSchema(conditionSchema, andConditionSchema);
export const isOrCondition = createIsNarrowSchema(conditionSchema, orConditionSchema);
export const isNeverCondition = createIsNarrowSchema(conditionSchema, neverConditionSchema);
export const isAlwaysCondition = createIsNarrowSchema(conditionSchema, alwaysConditionSchema);

export const isCondition = createIsNarrowSchema(z.unknown(), conditionSchema);
