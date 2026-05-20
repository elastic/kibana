import type { z } from '@kbn/zod/v4';
/**
 * Smart validation that rejects Mustache templates only if the value is a string.
 * Non-string values (numbers, booleans, etc.) pass through since they can't contain templates.
 */
export declare const NoMustacheValue: z.ZodUnknown;
/**
 * Array validation that rejects Mustache templates in any string elements.
 * Non-string array elements (numbers, booleans, etc.) pass through.
 */
export declare const NoMustacheArrayValues: z.ZodArray<z.ZodUnknown>;
/**
 * Source field names (from fields) - prevents Mustache templates in field references
 */
export declare const StreamlangSourceField: z.ZodString;
/**
 * Target field names (to fields) - prevents Mustache templates in field creation
 */
export declare const StreamlangTargetField: z.ZodString;
/**
 * Separator for join and split processors. Allows spaces and other characters.
 */
export declare const StreamlangSeparator: z.ZodString;
