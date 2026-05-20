import { z } from '@kbn/zod';
declare const createCompositeSLOBodySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    members: z.ZodArray<z.ZodObject<{
        sloId: z.ZodString;
        weight: z.ZodNumber;
        instanceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    compositeMethod: z.ZodLiteral<"weightedAverage">;
    timeWindow: z.ZodObject<{
        duration: z.ZodString;
        type: z.ZodLiteral<"rolling">;
    }, z.core.$strip>;
    budgetingMethod: z.ZodLiteral<"occurrences">;
    objective: z.ZodObject<{
        target: z.ZodNumber;
    }, z.core.$strip>;
    id: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const createCompositeSLOParamsSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        members: z.ZodArray<z.ZodObject<{
            sloId: z.ZodString;
            weight: z.ZodNumber;
            instanceId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        compositeMethod: z.ZodLiteral<"weightedAverage">;
        timeWindow: z.ZodObject<{
            duration: z.ZodString;
            type: z.ZodLiteral<"rolling">;
        }, z.core.$strip>;
        budgetingMethod: z.ZodLiteral<"occurrences">;
        objective: z.ZodObject<{
            target: z.ZodNumber;
        }, z.core.$strip>;
        id: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const createCompositeSLOResponseSchema: z.ZodObject<{
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
type CreateCompositeSLOInput = z.input<typeof createCompositeSLOBodySchema>;
type CreateCompositeSLOResponse = z.infer<typeof createCompositeSLOResponseSchema>;
export { createCompositeSLOParamsSchema, createCompositeSLOResponseSchema };
export type { CreateCompositeSLOInput, CreateCompositeSLOResponse };
