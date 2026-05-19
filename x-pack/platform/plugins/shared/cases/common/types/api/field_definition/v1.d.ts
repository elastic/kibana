import { z } from '@kbn/zod/v4';
export declare const FieldDefinitionsFindRequestSchema: z.ZodObject<{
    owner: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>, z.ZodArray<z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>]>>;
}, z.core.$strip>;
export type FieldDefinitionsFindRequest = z.infer<typeof FieldDefinitionsFindRequestSchema>;
export declare const FieldDefinitionsFindResponseSchema: z.ZodObject<{
    fieldDefinitions: z.ZodArray<z.ZodObject<{
        fieldDefinitionId: z.ZodString;
        name: z.ZodString;
        definition: z.ZodString;
        owner: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type FieldDefinitionsFindResponse = z.infer<typeof FieldDefinitionsFindResponseSchema>;
