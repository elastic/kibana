import { z } from '@kbn/zod/v4';
export declare const CaseObservableBaseSchema: z.ZodObject<{
    typeKey: z.ZodString;
    value: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const CaseObservableSchema: z.ZodObject<{
    typeKey: z.ZodString;
    value: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const CaseObservableTypeSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
}, z.core.$strip>;
export type Observable = z.infer<typeof CaseObservableSchema>;
export type ObservableType = z.infer<typeof CaseObservableTypeSchema>;
