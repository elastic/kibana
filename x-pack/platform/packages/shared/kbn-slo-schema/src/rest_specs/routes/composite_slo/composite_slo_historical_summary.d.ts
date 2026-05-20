import { z } from '@kbn/zod';
declare const fetchCompositeHistoricalSummaryParamsSchema: z.ZodObject<{
    body: z.ZodObject<{
        list: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const fetchCompositeHistoricalSummaryResponseSchema: z.ZodArray<z.ZodObject<{
    compositeId: z.ZodString;
    data: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        status: z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>;
        sliValue: z.ZodNumber;
        errorBudget: z.ZodObject<{
            initial: z.ZodNumber;
            consumed: z.ZodNumber;
            remaining: z.ZodNumber;
            isEstimated: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
type FetchCompositeHistoricalSummaryParams = z.infer<typeof fetchCompositeHistoricalSummaryParamsSchema.shape.body>;
type FetchCompositeHistoricalSummaryResponse = z.infer<typeof fetchCompositeHistoricalSummaryResponseSchema>;
export { fetchCompositeHistoricalSummaryParamsSchema, fetchCompositeHistoricalSummaryResponseSchema, };
export type { FetchCompositeHistoricalSummaryParams, FetchCompositeHistoricalSummaryResponse };
