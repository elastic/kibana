import { z } from '@kbn/zod/v4';
export declare const FieldDefinitionSchema: z.ZodObject<{
    fieldDefinitionId: z.ZodString;
    name: z.ZodString;
    definition: z.ZodString;
    owner: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export declare const CreateFieldDefinitionInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    definition: z.ZodString;
    owner: z.ZodString;
}, z.core.$strip>;
export type CreateFieldDefinitionInput = z.infer<typeof CreateFieldDefinitionInputSchema>;
export declare const UpdateFieldDefinitionInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    definition: z.ZodString;
    owner: z.ZodString;
}, z.core.$strip>;
export type UpdateFieldDefinitionInput = z.infer<typeof UpdateFieldDefinitionInputSchema>;
