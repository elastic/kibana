import type { z } from '@kbn/zod/v4';
export declare const stringOrNumberOrBoolean: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
export type StringOrNumberOrBoolean = string | number | boolean;
export type BinaryOperatorKeys = keyof Omit<ShorthandBinaryFilterCondition, 'field'>;
export type UnaryOperatorKeys = keyof Omit<ShorthandUnaryFilterCondition, 'field'>;
export type OperatorKeys = BinaryOperatorKeys | UnaryOperatorKeys;
export declare const BINARY_OPERATORS: BinaryOperatorKeys[];
export declare const UNARY_OPERATORS: UnaryOperatorKeys[];
export declare const ARRAY_OPERATORS: BinaryOperatorKeys[];
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
export declare const operatorToHumanReadableNameMap: {
    eq: string;
    neq: string;
    lt: string;
    lte: string;
    gt: string;
    gte: string;
    contains: string;
    startsWith: string;
    endsWith: string;
    exists: string;
    range: string;
    includes: string;
};
export declare const rangeConditionSchema: z.ZodObject<{
    gt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    gte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    lt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    lte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
}, z.core.$strip>;
export declare const shorthandBinaryFilterConditionSchema: z.ZodObject<{
    field: z.ZodString;
    eq: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    neq: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    lt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    lte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    gt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    gte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    contains: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    startsWith: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    endsWith: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    range: z.ZodOptional<z.ZodObject<{
        gt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        gte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        lt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        lte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    }, z.core.$strip>>;
    includes: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
}, z.core.$strip>;
export interface ShorthandUnaryFilterCondition {
    field: string;
    exists?: boolean;
}
export declare const shorthandUnaryFilterConditionSchema: z.ZodObject<{
    field: z.ZodString;
    exists: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type FilterCondition = ShorthandBinaryFilterCondition | ShorthandUnaryFilterCondition;
export declare const filterConditionSchema: z.ZodUnion<readonly [z.ZodObject<{
    field: z.ZodString;
    eq: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    neq: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    lt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    lte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    gt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    gte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    contains: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    startsWith: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    endsWith: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    range: z.ZodOptional<z.ZodObject<{
        gt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        gte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        lt: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        lte: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    }, z.core.$strip>>;
    includes: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
}, z.core.$strip>, z.ZodObject<{
    field: z.ZodString;
    exists: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>]>;
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
export type Condition = FilterCondition | AndCondition | OrCondition | NotCondition | NeverCondition | AlwaysCondition;
export declare const conditionSchema: z.Schema<Condition>;
export declare const andConditionSchema: z.ZodObject<{
    and: z.ZodArray<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
}, z.core.$strip>;
export declare const orConditionSchema: z.ZodObject<{
    or: z.ZodArray<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
}, z.core.$strip>;
export declare const neverConditionSchema: z.ZodObject<{
    never: z.ZodObject<{}, z.core.$strict>;
}, z.core.$strip>;
export declare const alwaysConditionSchema: z.ZodObject<{
    always: z.ZodObject<{}, z.core.$strict>;
}, z.core.$strip>;
export declare const notConditionSchema: z.ZodObject<{
    not: z.ZodLazy<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
}, z.core.$strip>;
export declare const isBinaryFilterCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    field: string;
    eq?: string | number | boolean | undefined;
    neq?: string | number | boolean | undefined;
    lt?: string | number | boolean | undefined;
    lte?: string | number | boolean | undefined;
    gt?: string | number | boolean | undefined;
    gte?: string | number | boolean | undefined;
    contains?: string | number | boolean | undefined;
    startsWith?: string | number | boolean | undefined;
    endsWith?: string | number | boolean | undefined;
    range?: {
        gt?: string | number | boolean | undefined;
        gte?: string | number | boolean | undefined;
        lt?: string | number | boolean | undefined;
        lte?: string | number | boolean | undefined;
    } | undefined;
    includes?: string | number | boolean | undefined;
}>;
export declare const isUnaryFilterCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    field: string;
    exists?: boolean | undefined;
}>;
export declare const isFilterCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    field: string;
    eq?: string | number | boolean | undefined;
    neq?: string | number | boolean | undefined;
    lt?: string | number | boolean | undefined;
    lte?: string | number | boolean | undefined;
    gt?: string | number | boolean | undefined;
    gte?: string | number | boolean | undefined;
    contains?: string | number | boolean | undefined;
    startsWith?: string | number | boolean | undefined;
    endsWith?: string | number | boolean | undefined;
    range?: {
        gt?: string | number | boolean | undefined;
        gte?: string | number | boolean | undefined;
        lt?: string | number | boolean | undefined;
        lte?: string | number | boolean | undefined;
    } | undefined;
    includes?: string | number | boolean | undefined;
} | {
    field: string;
    exists?: boolean | undefined;
}>;
export declare const isAndCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    and: unknown[];
}>;
export declare const isOrCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    or: unknown[];
}>;
export declare const isNeverCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    never: Record<string, never>;
}>;
export declare const isAlwaysCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    always: Record<string, never>;
}>;
export declare const isNotCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, {
    not: unknown;
}>;
export declare const isCondition: <TValue extends unknown>(value: TValue) => value is Extract<TValue, unknown>;
/**
 * Strict version of conditionSchema that rejects excess/unknown keys.
 * Pre-constructed for performance as DeepStrict creates proxy wrappers.
 */
export declare const conditionSchemaStrict: z.ZodPipe<z.ZodUnknown, z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
export declare const isConditionStrict: <TValue extends unknown>(value: TValue) => value is Extract<TValue, unknown>;
export declare const ALWAYS_CONDITION: AlwaysCondition;
export declare const NEVER_CONDITION: NeverCondition;
