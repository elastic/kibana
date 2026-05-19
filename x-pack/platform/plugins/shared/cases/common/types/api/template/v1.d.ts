import { z } from '@kbn/zod/v4';
/**
 * Sort field for templates.
 *
 * Keep this list aligned with indexed scalar mapping fields in the template SO type.
 */
export declare const TemplateSortFieldSchema: z.ZodEnum<{
    name: "name";
    owner: "owner";
    author: "author";
    isDefault: "isDefault";
    fieldCount: "fieldCount";
    templateId: "templateId";
    templateVersion: "templateVersion";
    deletedAt: "deletedAt";
    usageCount: "usageCount";
    lastUsedAt: "lastUsedAt";
    isLatest: "isLatest";
}>;
export type TemplateSortField = z.infer<typeof TemplateSortFieldSchema>;
/**
 * Sort order
 */
export declare const SortOrderSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type SortOrder = z.infer<typeof SortOrderSchema>;
/**
 * Request schema for finding/listing templates
 */
export declare const TemplatesFindRequestSchema: z.ZodObject<{
    page: z.ZodNumber;
    perPage: z.ZodNumber;
    sortField: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        name: "name";
        owner: "owner";
        author: "author";
        isDefault: "isDefault";
        fieldCount: "fieldCount";
        templateId: "templateId";
        templateVersion: "templateVersion";
        deletedAt: "deletedAt";
        usageCount: "usageCount";
        lastUsedAt: "lastUsedAt";
        isLatest: "isLatest";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    search: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    owner: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    isDeleted: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type TemplatesFindRequest = z.infer<typeof TemplatesFindRequestSchema>;
/**
 * Response schema for finding/listing templates
 */
declare const TemplateWithSearchMetaSchema: z.ZodObject<{
    templateId: z.ZodString;
    name: z.ZodString;
    owner: z.ZodString;
    definition: z.ZodString;
    templateVersion: z.ZodNumber;
    deletedAt: z.ZodNullable<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    author: z.ZodOptional<z.ZodString>;
    usageCount: z.ZodOptional<z.ZodNumber>;
    fieldCount: z.ZodOptional<z.ZodNumber>;
    fieldNames: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodString;
        control: z.ZodString;
    }, z.core.$strip>>>;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isLatest: z.ZodOptional<z.ZodBoolean>;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    fieldSearchMatches: z.ZodBoolean;
}, z.core.$strip>;
export type TemplateListItem = z.infer<typeof TemplateWithSearchMetaSchema>;
export declare const TemplatesFindResponseSchema: z.ZodObject<{
    templates: z.ZodArray<z.ZodObject<{
        templateId: z.ZodString;
        name: z.ZodString;
        owner: z.ZodString;
        definition: z.ZodString;
        templateVersion: z.ZodNumber;
        deletedAt: z.ZodNullable<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        author: z.ZodOptional<z.ZodString>;
        usageCount: z.ZodOptional<z.ZodNumber>;
        fieldCount: z.ZodOptional<z.ZodNumber>;
        fieldNames: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            label: z.ZodString;
            type: z.ZodString;
            control: z.ZodString;
        }, z.core.$strip>>>;
        lastUsedAt: z.ZodOptional<z.ZodString>;
        isDefault: z.ZodOptional<z.ZodBoolean>;
        isLatest: z.ZodOptional<z.ZodBoolean>;
        isEnabled: z.ZodOptional<z.ZodBoolean>;
        fieldSearchMatches: z.ZodBoolean;
    }, z.core.$strip>>;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
    total: z.ZodNumber;
}, z.core.$strip>;
export type TemplatesFindResponse = z.infer<typeof TemplatesFindResponseSchema>;
export {};
