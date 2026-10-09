import { z } from '@kbn/zod/v4';
export declare const bulkByIdsSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type BulkByIdsParams = z.infer<typeof bulkByIdsSchema>;
export declare const bulkByQuerySchema: z.ZodObject<{
    filter: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    match_all: z.ZodOptional<z.ZodLiteral<true>>;
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export type BulkByQueryParams = z.input<typeof bulkByQuerySchema>;
/**
 * Error shape for a single resource that failed inside a bulk operation.
 *
 * The nested `error` object reuses `errorResponseSchema` (the same shape
 * returned by single-resource routes on failure) via `.pick`, minus the
 * top-level `error` category label — inside a `200 OK` bulk response there
 * is no HTTP status to mirror, and `code` already conveys the category
 * machine-readably.
 *
 * `code` is a stable, machine-readable identifier scoped to the resource
 * kind (e.g. `RULE_NOT_FOUND`, `ACTION_POLICY_VERSION_CONFLICT`). See the
 * caller's error-code catalog on the server for the canonical list.
 *
 * `details` is optional structured context (e.g. per-field validation
 * issues, the conflicting version, the resource id) that clients can
 * surface without having to parse `message`.
 */
export declare const bulkErrorSchema: z.ZodObject<{
    id: z.ZodString;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Response shape for an executed bulk operation. Identical across the
 * by-ID bulk routes and the executed (`force: true`) variant of each
 * by-query endpoint, regardless of the underlying resource kind.
 */
export declare const bulkResponseSchema: z.ZodObject<{
    affected_count: z.ZodNumber;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BulkResponse = z.infer<typeof bulkResponseSchema>;
/**
 * Response shape for the dry-run (default) mode of the by-query endpoints.
 * Callers can inspect `match_count` and `sample` to confirm the query
 * targets the intended resources before re-sending with `force: true`.
 */
export declare const dryRunResponseSchema: z.ZodObject<{
    match_count: z.ZodNumber;
    sample: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type DryRunResponse = z.infer<typeof dryRunResponseSchema>;
/** Union of dry-run and executed responses returned by the by-query endpoints. */
export declare const bulkByQueryResultSchema: z.ZodUnion<readonly [z.ZodObject<{
    match_count: z.ZodNumber;
    sample: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    affected_count: z.ZodNumber;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>]>;
export type BulkByQueryResult = z.infer<typeof bulkByQueryResultSchema>;
