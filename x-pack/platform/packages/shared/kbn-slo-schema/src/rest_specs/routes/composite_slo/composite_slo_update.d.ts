import { z } from '@kbn/zod';
declare const updateCompositeSLOParamsSchema: z.ZodObject<{
    path: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        members: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sloId: z.ZodString;
            weight: z.ZodNumber;
            instanceId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        compositeMethod: z.ZodOptional<z.ZodLiteral<"weightedAverage">>;
        timeWindow: z.ZodOptional<z.ZodObject<{
            duration: z.ZodString;
            type: z.ZodLiteral<"rolling">;
        }, z.core.$strip>>;
        budgetingMethod: z.ZodOptional<z.ZodLiteral<"occurrences">>;
        objective: z.ZodOptional<z.ZodObject<{
            target: z.ZodNumber;
        }, z.core.$strip>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const updateCompositeSLOResponseSchema: z.ZodObject<{
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
type UpdateCompositeSLOInput = z.input<typeof updateCompositeSLOParamsSchema.shape.body>;
type UpdateCompositeSLOResponse = z.infer<typeof updateCompositeSLOResponseSchema>;
export { updateCompositeSLOParamsSchema, updateCompositeSLOResponseSchema };
export type { UpdateCompositeSLOInput, UpdateCompositeSLOResponse };
