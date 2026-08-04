import { z } from '@kbn/zod';
/**
 * Canonical shape of a composite summary index document. This single schema is the source of
 * truth for both writing the document (see `buildCompositeSummaryDoc`) and decoding it on read,
 * so the persisted and decoded shapes can never drift apart.
 */
declare const compositeSloSummaryDocumentSchema: z.ZodObject<{
    spaceId: z.ZodString;
    summaryUpdatedAt: z.ZodString;
    compositeSlo: z.ZodObject<{
        description: z.ZodString;
        id: z.ZodString;
        name: z.ZodString;
        tags: z.ZodArray<z.ZodString>;
        timeWindow: z.ZodObject<{
            duration: z.ZodString;
            type: z.ZodLiteral<"rolling">;
        }, z.core.$strip>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        budgetingMethod: z.ZodLiteral<"occurrences">;
        objective: z.ZodObject<{
            target: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
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
    unresolvedMemberIds: z.ZodArray<z.ZodString>;
    members: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>>;
}, z.core.$strip>;
type CompositeSLOSummaryDocument = z.infer<typeof compositeSloSummaryDocumentSchema>;
export { compositeSloSummaryDocumentSchema };
export type { CompositeSLOSummaryDocument };
