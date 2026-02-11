/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '@kbn/zod-helpers';

export const stringOrNumberOrBoolean = z
  .union([z.string(), z.number(), z.boolean()])
  .describe('A value that can be a string, number, or boolean.');

export type StringOrNumberOrBoolean = string | number | boolean;

export type BinaryOperatorKeys = keyof Omit<ShorthandBinaryFilterCondition, 'field'>;
export type UnaryOperatorKeys = keyof Omit<ShorthandUnaryFilterCondition, 'field'>;
export type OperatorKeys = BinaryOperatorKeys | UnaryOperatorKeys;

export const BINARY_OPERATORS: BinaryOperatorKeys[] = [
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
  'includes',
];

export const UNARY_OPERATORS: UnaryOperatorKeys[] = ['exists'];

export const ARRAY_OPERATORS: BinaryOperatorKeys[] = ['includes'];

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
  includes?: StringOrNumberOrBoolean;
}

export const operatorToHumanReadableNameMap = {
  eq: i18n.translate('xpack.streams.filter.equals', { defaultMessage: 'equals' }),
  neq: i18n.translate('xpack.streams.filter.notEquals', { defaultMessage: 'not equals' }),
  lt: i18n.translate('xpack.streams.filter.lessThan', { defaultMessage: 'less than' }),
  lte: i18n.translate('xpack.streams.filter.lessThanOrEquals', {
    defaultMessage: 'less than or equals',
  }),
  gt: i18n.translate('xpack.streams.filter.greaterThan', { defaultMessage: 'greater than' }),
  gte: i18n.translate('xpack.streams.filter.greaterThanOrEquals', {
    defaultMessage: 'greater than or equals',
  }),
  contains: i18n.translate('xpack.streams.filter.contains', { defaultMessage: 'contains' }),
  startsWith: i18n.translate('xpack.streams.filter.startsWith', { defaultMessage: 'starts with' }),
  endsWith: i18n.translate('xpack.streams.filter.endsWith', { defaultMessage: 'ends with' }),
  exists: i18n.translate('xpack.streams.filter.exists', { defaultMessage: 'exists' }),
  range: i18n.translate('xpack.streams.filter.range', { defaultMessage: 'in range' }),
  includes: i18n.translate('xpack.streams.filter.includes', { defaultMessage: 'includes' }),
};

export const rangeConditionSchema = z
  .object({
    gt: stringOrNumberOrBoolean.optional(),
    gte: stringOrNumberOrBoolean.optional(),
    lt: stringOrNumberOrBoolean.optional(),
    lte: stringOrNumberOrBoolean.optional(),
  })
  .describe('A condition specifying a range of values.');
// Shorthand binary: field + one of the operator keys
export const shorthandBinaryFilterConditionSchema = z
  .object({
    field: NonEmptyString.describe('The document field to filter on.'),
    eq: stringOrNumberOrBoolean.optional().describe('Equality comparison value.'),
    neq: stringOrNumberOrBoolean.optional().describe('Inequality comparison value.'),
    lt: stringOrNumberOrBoolean.optional().describe('Less-than comparison value.'),
    lte: stringOrNumberOrBoolean.optional().describe('Less-than-or-equal comparison value.'),
    gt: stringOrNumberOrBoolean.optional().describe('Greater-than comparison value.'),
    gte: stringOrNumberOrBoolean.optional().describe('Greater-than-or-equal comparison value.'),
    contains: stringOrNumberOrBoolean.optional().describe('Contains comparison value.'),
    startsWith: stringOrNumberOrBoolean.optional().describe('Starts-with comparison value.'),
    endsWith: stringOrNumberOrBoolean.optional().describe('Ends-with comparison value.'),
    range: rangeConditionSchema.optional().describe('Range comparison values.'),
    includes: stringOrNumberOrBoolean
      .optional()
      .describe('Checks if multivalue field includes the value.'),
  })
  .refine(
    (obj) =>
      // At least one operator must be present
      Object.keys(obj).some((key) => BINARY_OPERATORS.includes(key as BinaryOperatorKeys)),
    { message: 'At least one operator must be specified' }
  )
  .describe('A condition that compares a field to a value or range using an operator as the key.');

export interface ShorthandUnaryFilterCondition {
  field: string;
  exists?: boolean;
}

// Shorthand unary
export const shorthandUnaryFilterConditionSchema = z
  .object({
    field: NonEmptyString.describe('The document field to check.'),
    exists: z.boolean().optional().describe('Indicates whether the field exists or not.'),
  })
  .describe('A condition that checks for the existence or non-existence of a field.');

export type FilterCondition = ShorthandBinaryFilterCondition | ShorthandUnaryFilterCondition;

export const filterConditionSchema = z
  .union([shorthandBinaryFilterConditionSchema, shorthandUnaryFilterConditionSchema])
  .describe('A basic filter condition, either unary or binary.');

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

export const conditionSchema: z.Schema<Condition> = z
  .lazy(() =>
    z.union([
      filterConditionSchema,
      andConditionSchema,
      orConditionSchema,
      notConditionSchema,
      neverConditionSchema,
      alwaysConditionSchema,
    ])
  )
  .describe(
    'The root condition object. It can be a simple filter or a combination of other conditions.'
  );

export const andConditionSchema = z
  .object({
    and: z
      .array(conditionSchema)
      .describe(
        'An array of conditions. All sub-conditions must be true for this condition to be true.'
      ),
  })
  .describe('A logical AND that groups multiple conditions.');
export const orConditionSchema = z
  .object({
    or: z
      .array(conditionSchema)
      .describe(
        'An array of conditions. At least one sub-condition must be true for this condition to be true.'
      ),
  })
  .describe('A logical OR that groups multiple conditions.');
export const neverConditionSchema = z
  .object({
    never: z.strictObject({}).describe('An empty object. This condition never matches.'),
  })
  .describe('A condition that always evaluates to false.');
export const alwaysConditionSchema = z
  .object({
    always: z.strictObject({}).describe('An empty object. This condition always matches.'),
  })
  .describe(
    'A condition that always evaluates to true. Useful for catch-all scenarios, but use with caution as partitions are ordered.'
  );
export const notConditionSchema = z
  .object({
    not: z.lazy(() => conditionSchema).describe('A condition that negates another condition.'),
  })
  .describe('A logical NOT that negates a condition.');

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

export const ALWAYS_CONDITION: AlwaysCondition = Object.freeze({ always: {} });

export const NEVER_CONDITION: NeverCondition = Object.freeze({ never: {} });
