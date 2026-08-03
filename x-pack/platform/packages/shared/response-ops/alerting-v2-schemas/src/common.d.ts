import { z } from '@kbn/zod/v4';
declare const durationSchema: z.ZodString;
/**
 * Shared schema for tag arrays used across alerting v2 (rule metadata, action policies,
 * alert tag actions, tag filters). Each tag is up to `MAX_TAG_LENGTH` characters, up to
 * `MAX_TAGS` tags allowed.
 */
declare const tagsSchema: z.ZodArray<z.ZodString>;
/** Make a schema optional while preserving its `.describe()` metadata. */
declare const optionalWithDescription: <T extends z.ZodType>(schema: T) => z.ZodOptional<T>;
/**
 * Builds a schema that accepts either a single value or an array of values
 * and normalises both shapes to an array of length `1..max`.
 *
 * Intended for HTTP query parameters that can be delivered either as a single
 * value (`?key=a`) or as multiple occurrences (`?key=a&key=b`). The helper
 * absorbs the union/transform boilerplate at the parsing layer.
 *
 * The transform's explicit return type recovers `Array<z.output<T>>` for the
 * compiler. We intentionally skip the `.pipe(z.array(...))` re-validation
 * step: the single-value branch always produces a one-element array, which
 * trivially satisfies `min: 1`, and the array branch is already bounded by
 * `min`/`max` inside the union.
 *
 * @example
 *   const tagsQuerySchema = arrayOrSingleSchema(z.string().min(1).max(MAX_TAG_LENGTH), MAX_TAGS);
 */
declare const arrayOrSingleSchema: <T extends z.ZodType>(item: T, max: number) => z.ZodPipe<z.ZodUnion<readonly [T, z.ZodArray<T>]>, z.ZodTransform<z.core.output<T>[], z.core.output<T>[] | z.core.$InferUnionOutput<T>>>;
/**
 * Bounded integer schema for HTTP query parameters. Query values arrive as
 * strings, so a numeric string is converted to a number before validation while
 * real numbers (programmatic callers, unit tests) pass through untouched.
 *
 * @example
 *   page: queryIntSchema({ min: 1, max: MAX }).default(1).describe('Page number.')
 */
declare const queryIntSchema: ({ min, max }: {
    min: number;
    max: number;
}) => z.ZodPreprocess<z.ZodNumber>;
export { durationSchema, tagsSchema, optionalWithDescription, arrayOrSingleSchema, queryIntSchema };
