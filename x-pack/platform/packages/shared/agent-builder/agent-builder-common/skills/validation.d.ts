import { z } from '@kbn/zod/v4';
export { maxReferencedContentItems } from './referenced_content_shared';
/** Maximum allowed length for a skill ID. */
export declare const skillIdMaxLength = 64;
/** Maximum allowed length for a skill name. */
export declare const skillNameMaxLength = 64;
/** Regex for valid skill IDs (lowercase alphanumeric, hyphens, underscores). */
export declare const skillIdRegexp: RegExp;
/** Regex for valid skill names. */
export declare const skillNameRegexp: RegExp;
/** Maximum number of tools a skill can reference. */
export declare const maxToolsPerSkill = 5;
/**
 * Zod schema for validating skill create request bodies.
 */
export declare const skillCreateRequestSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    content: z.ZodString;
    referenced_content: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        relativePath: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>>>;
    tool_ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/**
 * Zod schema for validating skill update request bodies.
 */
export declare const skillUpdateRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    referenced_content: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        relativePath: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>>>;
    tool_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * Validates a skill ID has the right format.
 * Returns an error message if it fails, undefined otherwise.
 * @param skillId - Skill ID to validate
 */
export declare const validateSkillId: (skillId: string) => string | undefined;
