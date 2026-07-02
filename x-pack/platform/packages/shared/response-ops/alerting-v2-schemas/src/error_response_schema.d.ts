import { z } from '@kbn/zod/v4';
/**
 * Standard error response shape returned by every alerting v2 route handler.
 *
 * - `code`    — A stable, machine-readable identifier (e.g. `RULE_NOT_FOUND`, `INVALID_SCHEDULE`).
 *               Changing this value is a breaking change.
 * - `error`   — A short category label (e.g. `Not Found`, `Bad Request`). For
 *               display and logs.
 * - `message` — A human-friendly explanation. Can be
 *               rephrased, localized, or have typos fixed without breaking
 *               clients. Do not parse this field in client code.
 * - `details` — An optional structured context (e.g. the resource id that
 *               conflicted, per-field validation issues).
 */
export declare const errorResponseSchema: z.ZodObject<{
    code: z.ZodString;
    error: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
