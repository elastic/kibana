import { z } from '@kbn/zod';
declare const COMPOSITE_SLO_MIN_MEMBERS = 2;
declare const COMPOSITE_SLO_MAX_MEMBERS = 25;
declare const compositeSloIdSchema: z.ZodString;
declare const compositeTagsSchema: z.ZodArray<z.ZodString>;
declare const compositeTargetSchema: z.ZodObject<{
    target: z.ZodNumber;
}, z.core.$strip>;
declare const compositeOccurrencesBudgetingMethodSchema: z.ZodLiteral<"occurrences">;
declare const compositeRollingTimeWindowSchema: z.ZodObject<{
    duration: z.ZodString;
    type: z.ZodLiteral<"rolling">;
}, z.core.$strip>;
declare const compositeSloMemberSchema: z.ZodObject<{
    sloId: z.ZodString;
    weight: z.ZodNumber;
    instanceId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const compositeSloMembersSchema: z.ZodArray<z.ZodObject<{
    sloId: z.ZodString;
    weight: z.ZodNumber;
    instanceId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
declare const compositeMethodSchema: z.ZodLiteral<"weightedAverage">;
declare const compositeErrorBudgetSchema: z.ZodObject<{
    initial: z.ZodNumber;
    consumed: z.ZodNumber;
    remaining: z.ZodNumber;
    isEstimated: z.ZodBoolean;
}, z.core.$strip>;
declare const compositeStatusSchema: z.ZodUnion<readonly [z.ZodLiteral<"NO_DATA">, z.ZodLiteral<"HEALTHY">, z.ZodLiteral<"DEGRADING">, z.ZodLiteral<"VIOLATED">]>;
declare const compositeSloBaseDefinitionSchema: z.ZodObject<{
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
}, z.core.$strip>;
declare const compositeSloDefinitionSchema: z.ZodObject<{
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
    members: z.ZodArray<z.ZodObject<{
        sloId: z.ZodString;
        weight: z.ZodNumber;
        instanceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const storedCompositeSloDefinitionSchema: z.ZodObject<{
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
    members: z.ZodArray<z.ZodObject<{
        sloId: z.ZodString;
        weight: z.ZodNumber;
        instanceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const compositeSloMemberWithSummarySchema: z.ZodObject<{
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
}, z.core.$strip>;
declare const compositeSloSummarySchema: z.ZodObject<{
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
declare const compositeSloDefinitionResponseSchema: z.ZodObject<{
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
    members: z.ZodArray<z.ZodObject<{
        sloId: z.ZodString;
        weight: z.ZodNumber;
        instanceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const compositeSloWithSummaryResponseSchema: z.ZodObject<{
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
}, z.core.$strip>;
type CompositeSLOMemberWithSummary = z.infer<typeof compositeSloMemberWithSummarySchema>;
type CompositeSLOSummary = z.infer<typeof compositeSloSummarySchema>;
type CompositeSLODefinitionResponse = z.infer<typeof compositeSloDefinitionResponseSchema>;
type CompositeSLOWithSummaryResponse = z.infer<typeof compositeSloWithSummaryResponseSchema>;
export type { CompositeSLOMemberWithSummary, CompositeSLOSummary, CompositeSLODefinitionResponse, CompositeSLOWithSummaryResponse, };
export { COMPOSITE_SLO_MIN_MEMBERS, COMPOSITE_SLO_MAX_MEMBERS, compositeSloIdSchema, compositeTagsSchema, compositeTargetSchema, compositeOccurrencesBudgetingMethodSchema, compositeRollingTimeWindowSchema, compositeSloMemberSchema, compositeSloMembersSchema, compositeMethodSchema, compositeErrorBudgetSchema, compositeStatusSchema, compositeSloBaseDefinitionSchema, compositeSloDefinitionSchema, storedCompositeSloDefinitionSchema, compositeSloMemberWithSummarySchema, compositeSloSummarySchema, compositeSloDefinitionResponseSchema, compositeSloWithSummaryResponseSchema, };
