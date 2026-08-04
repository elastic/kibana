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
/**
 * Compose a base ES|QL query with an appendable segment to avoid fragile
 * string concatenation. The segment is typically a bare command (e.g.
 * `WHERE x > 0`); a leading pipe is tolerated and stripped so the pipe is
 * always supplied internally.
 */
export declare function composeEsqlQuery(base: string, segment: string): string;
