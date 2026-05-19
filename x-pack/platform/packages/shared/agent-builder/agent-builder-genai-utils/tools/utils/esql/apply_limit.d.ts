/**
 * Applies a limit to an ES|QL query string.
 *
 * - If the last command is `LIMIT N` (integer literal), it is replaced with
 *   `LIMIT min(N, limit)`.
 * - Otherwise (including `LIMIT ?param` where the value isn't statically known),
 *   a new `| LIMIT <limit>` pipe is appended. ES|QL applies the narrower of the
 *   two at execution time.
 * - Any non-trailing `LIMIT` is left untouched.
 *
 * If the input query has parse errors, it is returned unchanged so the caller
 * surfaces the error from Elasticsearch against the exact query they provided.
 *
 * The caller is expected to pass a positive integer `limit`; this is not
 * validated.
 */
export declare const applyLimit: (query: string, limit: number) => string;
