import { z } from '@kbn/zod';
declare const getCompositeSLOParamsSchema: z.ZodObject<{
    path: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const getCompositeSLOResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    compositeMethod: z.ZodLiteral<"weightedAverage">;
    timeWindow: z.ZodObject<{
        duration: z.ZodString;
        type: z.ZodLiteral<"rolling">;
    }, z.core.$strip>;
    budgetingMethod: z.ZodLiteral<"occurrences">;
    objective: z.ZodObject<{
        target: z.ZodNumber;
    }, z.core.$strip>;
    tags: z.ZodArray<z.ZodString>;
    enabled: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    createdBy: z.ZodString;
    updatedBy: z.ZodString;
    version: z.ZodNumber;
    summary: z.ZodObject<{
        sliValue: z.ZodNumber;
        errorBudget: z.ZodObject<{
            initial: z.ZodNumber;
            consumed: z.ZodNumber;
            remaining: z.ZodNumber;
            isEstimated: z.ZodBoolean;
        }, z.core.$strip>;
        status: z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>;
        fiveMinuteBurnRate: z.ZodNumber;
        oneHourBurnRate: z.ZodNumber;
        oneDayBurnRate: z.ZodNumber;
    }, z.core.$strip>;
    members: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        weight: z.ZodNumber;
        normalisedWeight: z.ZodNumber;
        sliValue: z.ZodNumber;
        status: z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>;
        errorBudget: z.ZodOptional<z.ZodObject<{
            initial: z.ZodNumber;
            consumed: z.ZodNumber;
            remaining: z.ZodNumber;
            isEstimated: z.ZodBoolean;
        }, z.core.$strip>>;
        fiveMinuteBurnRate: z.ZodOptional<z.ZodNumber>;
        oneHourBurnRate: z.ZodOptional<z.ZodNumber>;
        oneDayBurnRate: z.ZodOptional<z.ZodNumber>;
        instanceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type GetCompositeSLOResponse = z.infer<typeof getCompositeSLOResponseSchema>;
export { getCompositeSLOParamsSchema, getCompositeSLOResponseSchema };
export type { GetCompositeSLOResponse };
