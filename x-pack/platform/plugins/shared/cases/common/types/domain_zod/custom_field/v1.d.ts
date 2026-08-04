import { z } from '@kbn/zod/v4';
import { CustomFieldTypes } from '../../domain/custom_field/v1';
export { CustomFieldTypes };
export declare const CustomFieldTextTypeSchema: z.ZodLiteral<CustomFieldTypes.TEXT>;
export declare const CustomFieldToggleTypeSchema: z.ZodLiteral<CustomFieldTypes.TOGGLE>;
export declare const CustomFieldNumberTypeSchema: z.ZodLiteral<CustomFieldTypes.NUMBER>;
declare const CaseCustomFieldTextSchema: z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.TEXT>;
    value: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const CaseCustomFieldToggleSchema: z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.TOGGLE>;
    value: z.ZodNullable<z.ZodBoolean>;
}, z.core.$strip>;
export declare const CaseCustomFieldNumberSchema: z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.NUMBER>;
    value: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export declare const CaseCustomFieldSchema: z.ZodUnion<readonly [z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.TEXT>;
    value: z.ZodNullable<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.TOGGLE>;
    value: z.ZodNullable<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.NUMBER>;
    value: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>]>;
export declare const CaseCustomFieldsSchema: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.TEXT>;
    value: z.ZodNullable<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.TOGGLE>;
    value: z.ZodNullable<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodString;
    type: z.ZodLiteral<CustomFieldTypes.NUMBER>;
    value: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>]>>;
export type CaseCustomFields = z.infer<typeof CaseCustomFieldsSchema>;
export type CaseCustomField = z.infer<typeof CaseCustomFieldSchema>;
export type CaseCustomFieldToggle = z.infer<typeof CaseCustomFieldToggleSchema>;
export type CaseCustomFieldText = z.infer<typeof CaseCustomFieldTextSchema>;
export type CaseCustomFieldNumber = z.infer<typeof CaseCustomFieldNumberSchema>;
