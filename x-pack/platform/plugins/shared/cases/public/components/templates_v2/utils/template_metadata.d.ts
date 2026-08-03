export interface TemplateMetadata {
    name: string;
    description: string;
    tags: string[];
}
export interface TemplateMetadataErrors {
    name?: string;
    description?: string;
    tags?: string;
}
/**
 * Canonicalizes metadata (trim name/description, drop empty/duplicate tags). Normalization is applied
 * at validate/save time only — the Configuration-tab inputs keep the raw keystrokes so typing isn't
 * fought, and a whitespace-only name still surfaces the required error (its trimmed length is 0).
 */
export declare const normalizeTemplateMetadata: (metadata: TemplateMetadata) => TemplateMetadata;
export declare const validateTemplateMetadata: (metadata: TemplateMetadata) => TemplateMetadataErrors;
export declare const hasTemplateMetadataErrors: (errors: TemplateMetadataErrors) => boolean;
