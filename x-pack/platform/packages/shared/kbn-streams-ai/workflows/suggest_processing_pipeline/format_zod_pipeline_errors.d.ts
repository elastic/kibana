import type { z } from '@kbn/zod/v4';
/**
 * Narrows Zod union validation errors to only the issues relevant to each step's
 * intended `action` type. Without this, a union of 6 processor schemas produces
 * errors for all 6 variants even when only one is relevant — flooding the LLM
 * with noise.
 *
 * When `allowedActions` is provided, steps whose action is not in the set are
 * reported as disallowed rather than validated against the full schema.
 */
export declare function formatZodPipelineErrors(error: z.ZodError, input: unknown, allowedActions?: Set<string>): Array<{
    stepIndex: number;
    action: string;
    message: string;
}>;
