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
declare const updateCompositeSLOInputSchema: z.ZodObject<{
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
    id: z.ZodString;
    spaceId: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
type UpdateCompositeSLOInput = z.input<typeof updateCompositeSLOInputSchema>;
export type { UpdateCompositeSLOInput };
export { updateCompositeSLOParamsSchema };
