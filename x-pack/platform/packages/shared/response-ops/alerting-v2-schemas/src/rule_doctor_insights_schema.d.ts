import { z } from '@kbn/zod/v4';
export declare const insightStatusSchema: z.ZodEnum<{
    open: "open";
    dismissed: "dismissed";
    applied: "applied";
}>;
export type InsightStatus = z.infer<typeof insightStatusSchema>;
export declare const listInsightsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    perPage: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    status: z.ZodOptional<z.ZodEnum<{
        open: "open";
        dismissed: "dismissed";
        applied: "applied";
    }>>;
    type: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
    rule_ids: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>, z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;
export declare const getInsightParamsSchema: z.ZodObject<{
    insight_id: z.ZodString;
}, z.core.$strip>;
export type GetInsightParams = z.infer<typeof getInsightParamsSchema>;
export declare const updateInsightStatusParamsSchema: z.ZodObject<{
    insight_id: z.ZodString;
}, z.core.$strip>;
export type UpdateInsightStatusParams = z.infer<typeof updateInsightStatusParamsSchema>;
export declare const updateInsightStatusBodySchema: z.ZodObject<{
    status: z.ZodEnum<{
        open: "open";
        dismissed: "dismissed";
        applied: "applied";
    }>;
}, z.core.$strip>;
export type UpdateInsightStatusBody = z.infer<typeof updateInsightStatusBodySchema>;
