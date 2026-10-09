import { z } from '@kbn/zod/v4';
/**
 * Identifier for a resource a client can address and may name itself
 * (`PUT /rules/{id}`). Restricted to characters that survive a URL path
 * segment and a log line unambiguously, and that cannot differ byte-wise
 * while looking identical. The server-generated default is a UUID v4, which
 * satisfies it.
 *
 * Not trimmed: the value addresses a resource, so padding is rejected rather
 * than normalised into a lookup for a different id.
 */
declare const entityIdSchema: z.ZodString;
/**
 * Identifier of an alert series. Always a server-generated SHA-256 digest, so
 * it is exactly 64 lowercase hex characters — callers echo back a value we
 * produced rather than composing one.
 */
declare const groupHashSchema: z.ZodString;
/** Semantics every client-addressable id carries; append to its `.describe()`. */
declare const ENTITY_ID_NOTE = "Chosen at creation and permanent \u2014 it cannot be changed afterwards. Re-using the id of a deleted resource is allowed but discouraged: execution history, change history, and alert episodes recorded under that id are retained and are attributed to the new resource. Ids appear in URLs and logs, so keep them free of sensitive data.";
declare const durationSchema: z.ZodString;
/**
 * Shared schema for tag arrays used across alerting v2 (rule metadata, action policies,
 * alert tag actions, tag filters). Each tag is up to `MAX_TAG_LENGTH` characters, up to
 * `MAX_TAGS` tags allowed.
 */
declare const tagsSchema: z.ZodArray<z.ZodString>;
/**
 * Caveat appended to every count in a list response: Elasticsearch stops counting hits at
 * 10,000 unless the read opts into an exact count, and no read promises to keep doing so.
 */
declare const ESTIMATED_COUNT_NOTE = "This count is an estimate: results above 10,000 may be reported as 10,000.";
/** Response shape of the tag endpoints: the unique tags, wrapped in an object. */
export declare const tagsResponseSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type TagsResponse = z.infer<typeof tagsResponseSchema>;
/**
 * Identity that performed a write, reported on `created_by` / `updated_by`.
 *
 * A user profile ID is recorded rather than a username because usernames and
 * full names change while a profile ID does not.
 *
 * The object shape (rather than a bare ID) exists so identity can be described
 * in more detail later. `profile_uid` is nullable so the three states stay
 * distinct: a `null` actor is a write with no user behind it (a background
 * task, say), `{ profile_uid: null }` is a user whose profile could not be
 * resolved, and a populated `profile_uid` is a fully attributed write.
 *
 * Deliberately not `.strict()`: additional identity fields are expected to be
 * added, and older clients should tolerate them.
 */
export declare const actorSchema: z.ZodObject<{
    profile_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Actor = z.infer<typeof actorSchema>;
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
declare const arrayOrSingleSchema: <T extends z.ZodType>(item: T, max: number) => z.ZodPipe<z.ZodUnion<readonly [T, z.ZodArray<T>]>, z.ZodTransform<z.TypeOf<T>[], z.TypeOf<T>[] | z.core.$InferUnionOutput<T>>>;
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
export { durationSchema, entityIdSchema, groupHashSchema, tagsSchema, optionalWithDescription, arrayOrSingleSchema, queryIntSchema, ENTITY_ID_NOTE, ESTIMATED_COUNT_NOTE, };
