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

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

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
];

export const UNARY_OPERATORS: UnaryOperatorKeys[] = ['exists'];

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
};

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
      Object.keys(obj).some((key) => BINARY_OPERATORS.includes(key as BinaryOperatorKeys)),
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

export type FilterCondition =
  | (ShorthandBinaryFilterCondition & { type: 'filter' })
  | (ShorthandUnaryFilterCondition & { type: 'filter' });

export interface AndCondition {
  type: 'and';
  and: Condition[];
}

export interface OrCondition {
  type: 'or';
  or: Condition[];
}

export interface AlwaysCondition {
  type: 'always';
  always: {};
}

export interface NeverCondition {
  type: 'never';
  never: {};
}

export interface NotCondition {
  type: 'not';
  not: Condition;
}

export type Condition =
  | FilterCondition
  | AndCondition
  | OrCondition
  | NotCondition
  | NeverCondition
  | AlwaysCondition;

const typedFilterConditionObjectSchema = z.object({
  type: z.literal('filter'),
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
  exists: z.boolean().optional(),
});

const typedFilterConditionSchema = typedFilterConditionObjectSchema;

const typedShorthandBinaryFilterConditionSchema = typedFilterConditionObjectSchema.superRefine(
  (condition, ctx) => {
    const hasExists = 'exists' in condition;
    const hasOperator = BINARY_OPERATORS.some((key) => key in condition);

    if (hasExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Binary filter conditions cannot include exists',
      });
    }

    if (!hasOperator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one operator must be specified',
      });
    }
  }
);

const typedShorthandUnaryFilterConditionSchema = typedFilterConditionObjectSchema.superRefine(
  (condition, ctx) => {
    const hasOperator = BINARY_OPERATORS.some((key) => key in condition);
    if (hasOperator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unary filter conditions cannot include binary operators',
      });
    }
  }
);

export const filterConditionSchema = typedFilterConditionSchema;

const conditionSchemaInternal: z.ZodType<Condition> = z.lazy(
  () =>
    z.discriminatedUnion('type', [
      typedFilterConditionObjectSchema,
      z.object({ type: z.literal('and'), and: z.array(conditionSchemaInternal) }),
      z.object({ type: z.literal('or'), or: z.array(conditionSchemaInternal) }),
      z.object({ type: z.literal('not'), not: conditionSchemaInternal }),
      z.object({ type: z.literal('never'), never: z.strictObject({}) }),
      z.object({ type: z.literal('always'), always: z.strictObject({}) }),
    ]) as unknown as z.ZodType<Condition>
);

export const conditionSchema = z
  .preprocess(
    (value) => ensureConditionType(value as LegacyCondition | Condition),
    conditionSchemaInternal
  )
  // Hint for the Zod → OpenAPI converter that this schema should be exposed
  // as a reusable OpenAPI component named "StreamlangCondition".
  .describe('@kbn/oas-component:StreamlangCondition')
  .superRefine((obj, ctx) => {
    if ((obj as any)?.type !== 'filter') return;

    const condition = obj as unknown as Record<string, unknown>;
    const hasOperator = BINARY_OPERATORS.some((key) => key in condition);
    const hasExists = 'exists' in condition;

    if (hasOperator && hasExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Filter condition cannot mix exists with other operators',
      });
      return;
    }

    if (hasExists) {
      return;
    }

    if (!hasOperator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one operator must be specified',
      });
    }
  });

export const andConditionSchema = z.lazy(() =>
  z.object({ type: z.literal('and'), and: z.array(conditionSchema) })
);
export const orConditionSchema = z.lazy(() =>
  z.object({ type: z.literal('or'), or: z.array(conditionSchema) })
);
export const neverConditionSchema = z.object({
  type: z.literal('never'),
  never: z.strictObject({}),
});
export const alwaysConditionSchema = z.object({
  type: z.literal('always'),
  always: z.strictObject({}),
});
export const notConditionSchema = z.lazy(() =>
  z.object({ type: z.literal('not'), not: conditionSchema })
);

export const isBinaryFilterCondition = createIsNarrowSchema(
  conditionSchema,
  typedShorthandBinaryFilterConditionSchema
);
export const isUnaryFilterCondition = createIsNarrowSchema(
  conditionSchema,
  typedShorthandUnaryFilterConditionSchema
);
export const isFilterCondition = createIsNarrowSchema(conditionSchema, filterConditionSchema);

export const isAndCondition = createIsNarrowSchema(conditionSchema, andConditionSchema);
export const isOrCondition = createIsNarrowSchema(conditionSchema, orConditionSchema);
export const isNeverCondition = createIsNarrowSchema(conditionSchema, neverConditionSchema);
export const isAlwaysCondition = createIsNarrowSchema(conditionSchema, alwaysConditionSchema);
export const isNotCondition = createIsNarrowSchema(conditionSchema, notConditionSchema);

export const isCondition = createIsNarrowSchema(z.unknown(), conditionSchema);

type LegacyCondition =
  | ShorthandBinaryFilterCondition
  | ShorthandUnaryFilterCondition
  | { and: LegacyCondition[] }
  | { or: LegacyCondition[] }
  | { not: LegacyCondition }
  | { type: 'never'; never: {} }
  | { type: 'always'; always: {} };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cloneFilterCondition = (
  condition: ShorthandBinaryFilterCondition | ShorthandUnaryFilterCondition
) =>
  ({
    type: 'filter',
    ...condition,
  } as FilterCondition);

export const ensureConditionType = (condition: LegacyCondition | Condition): Condition => {
  if (!isRecord(condition)) {
    return condition as Condition;
  }

  if ('type' in condition) {
    return condition as Condition;
  }

  if ('and' in condition && Array.isArray(condition.and)) {
    return {
      type: 'and',
      and: condition.and.map(ensureConditionType),
    };
  }

  if ('or' in condition && Array.isArray(condition.or)) {
    return {
      type: 'or',
      or: condition.or.map(ensureConditionType),
    };
  }

  if ('not' in condition && condition.not) {
    return {
      type: 'not',
      not: ensureConditionType(condition.not),
    };
  }

  if ('always' in condition) {
    return { type: 'always', always: {} };
  }

  if ('never' in condition) {
    return { type: 'never', never: {} };
  }

  return cloneFilterCondition(
    condition as unknown as ShorthandBinaryFilterCondition | ShorthandUnaryFilterCondition
  );
};

export const ALWAYS_CONDITION: AlwaysCondition = Object.freeze({ type: 'always', always: {} });

export const NEVER_CONDITION: NeverCondition = Object.freeze({ type: 'never', never: {} });
