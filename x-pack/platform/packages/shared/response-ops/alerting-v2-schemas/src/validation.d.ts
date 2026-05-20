export declare function parseDurationToMs(value: string): number;
/**
 * Validate a duration string format (e.g., "5m", "1h", "30s", "250ms")
 * @returns Error message if invalid, undefined if valid
 */
export declare function validateDuration(value: string): string | void;
/**
 * Validate that a duration string does not exceed a maximum duration.
 * Both values must be valid duration strings.
 * @returns Error message if exceeded, undefined if valid
 */
export declare function validateMaxDuration(value: string, max: string): string | void;
/**
 * Validate that a duration string is not below a minimum duration.
 * Both values must be valid duration strings.
 * @returns Error message if below minimum, undefined if valid
 */
export declare function validateMinDuration(value: string, min: string): string | void;
/**
 * Validate an ES|QL query string
 * @returns Error message if invalid, undefined if valid
 */
export declare function validateEsqlQuery(query: string): string | void;
