import { z } from '@kbn/zod/v4';
/**
 * Schema for bulk operation request bodies.
 *
 * At least one targeting param must be provided:
 * - `ids` — explicit list (cannot be combined with filter/search/match_all)
 * - `filter` / `search` — scoped selection
 * - `match_all` — explicit opt-in to target every rule
 */
export declare const bulkOperationParamsSchema: z.ZodObject<{
    ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    filter: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    match_all: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strip>;
export type BulkOperationParams = z.infer<typeof bulkOperationParamsSchema>;
