import { z } from '@kbn/zod/v4';
export declare const matchRulesBodySchema: z.ZodObject<{
    matcher: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    page: z.ZodOptional<z.ZodNumber>;
    per_page: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export type MatchRulesBody = z.infer<typeof matchRulesBodySchema>;
