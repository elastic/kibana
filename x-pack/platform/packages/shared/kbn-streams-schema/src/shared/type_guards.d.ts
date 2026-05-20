import type { z } from '@kbn/zod/v4';
/**
 * Type guard to check if a value is a non-null object (record).
 * Useful for safely accessing properties on unknown values.
 */
export declare const isRecord: (value: unknown) => value is Record<string, unknown>;
export declare function createIsNarrowSchema<TBaseSchema extends z.ZodType, TNarrowSchema extends z.ZodType>(_base: TBaseSchema, narrow: TNarrowSchema): <TValue extends z.output<TBaseSchema>>(value: TValue) => value is Extract<TValue, z.output<TNarrowSchema>>;
export declare function createAsSchemaOrThrow<TBaseSchema extends z.ZodType, TNarrowSchema extends z.ZodType>(_base: TBaseSchema, narrow: TNarrowSchema): <TValue extends z.output<TBaseSchema>>(value: TValue) => Extract<TValue, z.output<TNarrowSchema>>;
export declare function isSchema<TSchema extends z.ZodType>(schema: TSchema, value: unknown): value is z.output<TSchema>;
export declare function assertsSchema<TSchema extends z.ZodType>(schema: TSchema, subject: unknown): asserts subject is z.output<TSchema>;
