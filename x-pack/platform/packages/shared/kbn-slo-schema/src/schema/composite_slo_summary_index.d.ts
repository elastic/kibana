import { z } from '@kbn/zod';
/**
 * Flat summary fields persisted on composite summary index documents (see task `buildSummaryDoc`).
 * Other top-level keys (`spaceId`, `summaryUpdatedAt`, `compositeSlo`, …) are ignored by decode.
 */
declare const storedCompositeSloSummarySchema: z.ZodObject<{
    sliValue: z.ZodNumber;
    status: z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>;
    errorBudgetInitial: z.ZodNumber;
    errorBudgetConsumed: z.ZodNumber;
    errorBudgetRemaining: z.ZodNumber;
    errorBudgetIsEstimated: z.ZodBoolean;
    fiveMinuteBurnRate: z.ZodNumber;
    oneHourBurnRate: z.ZodNumber;
    oneDayBurnRate: z.ZodNumber;
    members: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>>;
}, z.core.$strip>;
export { storedCompositeSloSummarySchema };
