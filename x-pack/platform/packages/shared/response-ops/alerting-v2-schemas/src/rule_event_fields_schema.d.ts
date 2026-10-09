import { z } from '@kbn/zod/v4';
export declare const ruleEventFieldsQuerySchema: z.ZodObject<{
    matcher: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type RuleEventFieldsQuery = z.infer<typeof ruleEventFieldsQuerySchema>;
export declare const ruleEventFieldsResponseSchema: z.ZodArray<z.ZodString>;
export type RuleEventFieldsResponse = z.infer<typeof ruleEventFieldsResponseSchema>;
