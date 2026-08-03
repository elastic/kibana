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
 * Response shape for an executed bulk operation. Identical across the
 * by-ID bulk routes and the executed (`force: true`) variant of each
 * by-query endpoint, regardless of the underlying resource kind.
 */
export declare const bulkResponseSchema: z.ZodObject<{
    affected_count: z.ZodNumber;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        error: z.ZodObject<{
            message: z.ZodString;
            code: z.ZodString;
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
            message: z.ZodString;
            code: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>]>;
export type BulkByQueryResult = z.infer<typeof bulkByQueryResultSchema>;
