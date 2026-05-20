import type { StringOrNumberOrBoolean } from '../conditions';
/**
 * Encodes a value for use in Painless scripts.
 * - Strings are wrapped in double quotes with proper escaping
 * - Booleans are converted to 'true' or 'false'
 * - Null/undefined are converted to 'null'
 * - Numbers are returned as-is
 */
export declare function encodeValue(value: StringOrNumberOrBoolean | null | undefined): string | number;
