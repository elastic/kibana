/**
 * Generates a short 12-character alphanumeric identifier.
 */
export declare function generateId(): string;
export declare const MIN_NAME_LENGTH = 2;
export declare const MAX_NAME_LENGTH = 256;
/**
 * Normalizes a title/name for use as an integration or data stream identifier.
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Collapses multiple consecutive underscores into one
 * - Removes leading/trailing underscores for compatibility
 */
export declare const normalizeTitleName: (value: string) => string;
/**
 * Validates that a name contains only valid characters for Elastic integrations.
 * Allowed: lowercase letters, numbers, underscores, and spaces (spaces will be converted to underscores).
 * @returns true if valid, false otherwise
 */
export declare const isValidNameFormat: (value: string) => boolean;
/**
 * Validates that a name starts with a letter (required for integration names).
 * After normalization, names must start with a letter or underscore, but we encourage
 * starting with a letter for better compatibility.
 * @returns true if starts with a letter, false otherwise
 */
export declare const startsWithLetter: (value: string) => boolean;
/**
 * Validates that a name is not purely numeric (after removing spaces/underscores).
 * Names must contain at least one letter.
 * @returns true if valid (contains at least one letter), false if purely numeric
 */
export declare const isNotPurelyNumeric: (value: string) => boolean;
/**
 * Validates that a name meets the minimum length requirement (2 characters after normalization).
 * @returns true if valid, false otherwise
 */
export declare const meetsMinLength: (value: string) => boolean;
/**
 * Validates that a name does not exceed the maximum length (256 characters).
 * @returns true if valid, false otherwise
 */
export declare const meetsMaxLength: (value: string) => boolean;
