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
 * Validate an ES|QL query string. A parser crash is reported as an invalid
 * query rather than thrown, so route validation answers 400 instead of 500.
 * @returns Error message if invalid, undefined if valid
 */
export declare function validateEsqlQuery(query: string): string | void;
/**
 * Validate an appendable segment on its own, against a placeholder source.
 * Composing cannot do this: the parser drops a command it fails to read, so an
 * unparseable segment yields the base query unchanged and validates.
 * @returns Error message if invalid, undefined if valid
 */
export declare function validateEsqlQuerySegment(segment: string): string | void;
/**
 * Validate the query obtained by composing `base` with `segment`.
 * @returns Error message if the composition or the result is invalid, undefined if valid
 */
export declare function validateComposedEsqlQuery(base: string, segment: string): string | void;
/**
 * Compose a base ES|QL query with an appendable segment to avoid fragile
 * string concatenation. The segment is typically a bare command (e.g.
 * `WHERE x > 0`); a leading pipe is tolerated and stripped so the pipe is
 * always supplied internally.
 */
export declare function composeEsqlQuery(base: string, segment: string): string;
