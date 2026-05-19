import { z } from '@kbn/zod/v4';
/**
 * One additional markdown file attached to a skill (same shape as API `referenced_content` items).
 */
export interface ReferencedContentItem {
    name: string;
    relativePath: string;
    content: string;
}
declare const skillFormObjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    content: z.ZodString;
    tool_ids: z.ZodArray<z.ZodString>;
    referenced_content: z.ZodArray<z.ZodType<ReferencedContentItem, unknown, z.core.$ZodTypeInternals<ReferencedContentItem, unknown>>>;
}, z.core.$strip>;
export declare const skillFormValidationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    content: z.ZodString;
    tool_ids: z.ZodArray<z.ZodString>;
    referenced_content: z.ZodArray<z.ZodType<ReferencedContentItem, unknown, z.core.$ZodTypeInternals<ReferencedContentItem, unknown>>>;
}, z.core.$strip>;
export type SkillFormData = z.infer<typeof skillFormObjectSchema>;
export {};
