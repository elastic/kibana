/**
 * Converts Elasticsearch date math expressions into Painless code
 *
 * Converts Elasticsearch date math expressions into Painless code that matches ES's behavior:
 * - Uses ZonedDateTime for calendar units (years, months) to handle variable-length periods correctly
 * - Uses millisecond arithmetic only when ONLY time units are involved (better performance)
 *
 * The generated Painless code returns an ISO 8601 string for string comparisons in conditions.
 */
export declare function evaluateDateMath(expression: string): string;
