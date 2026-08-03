import { z } from '@kbn/zod';
declare const findCompositeSLOQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    perPage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    sortBy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"name">, z.ZodLiteral<"createdAt">, z.ZodLiteral<"updatedAt">]>>;
    sortDirection: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"asc">, z.ZodLiteral<"desc">]>>;
    tags: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>>;
    status: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>, z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>>>>;
}, z.core.$strip>;
declare const findCompositeSLOParamsSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodObject<{
        search: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        perPage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        sortBy: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"name">, z.ZodLiteral<"createdAt">, z.ZodLiteral<"updatedAt">]>>;
        sortDirection: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"asc">, z.ZodLiteral<"desc">]>>;
        tags: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>>;
        status: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>, z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const findCompositeSLOResponseSchema: z.ZodObject<{
    page: z.ZodNumber;
    perPage: z.ZodNumber;
    total: z.ZodNumber;
    results: z.ZodArray<z.ZodObject<{
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
            sloId: z.ZodString;
            weight: z.ZodNumber;
            instanceId: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
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
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type FindCompositeSLOParams = z.infer<typeof findCompositeSLOQuerySchema>;
type FindCompositeSLOResponse = z.output<typeof findCompositeSLOResponseSchema>;
export { findCompositeSLOParamsSchema, findCompositeSLOResponseSchema };
export type { FindCompositeSLOParams, FindCompositeSLOResponse };
