/**
 * A segment in a parsed JSON path. Either a key (object field name) or an index (array position).
 */
export type JsonPathSegment = {
    type: 'key';
    name: string;
} | {
    type: 'index';
    index: number;
};
/**
 * Result of parsing a JSON path.
 */
export interface ParsedJsonPath {
    segments: JsonPathSegment[];
    originalPath: string;
}
/**
 * Error thrown when a JSON path is malformed.
 */
export declare class JsonPathParseError extends Error {
    readonly path: string;
    readonly reason: string;
    readonly position?: number | undefined;
    constructor(path: string, reason: string, position?: number | undefined);
}
/**
 * Parses a JSON path string into typed segments.
 *
 * This implementation follows a subset of JSONPath (RFC 9535) syntax:
 * - Dot notation: user.address.city
 * - Bracket notation for array indices: items[0]
 * - Quoted bracket notation for special keys: ['user.name'], ["key with spaces"]
 * - Optional $ root selector: $.name and name are equivalent
 * - Mixed notation: $.store['items'][0].name
 * - Escape sequences in quoted keys: \', \", \\
 * - Optional whitespace inside brackets: [ 0 ], [ 'key' ]
 *
 * @param path - The JSON path string to parse
 * @param errorPositionOffset - Optional offset for error positions (useful when path comes from a larger query)
 * @throws {JsonPathParseError} If the path is malformed
 */
export declare function parseJsonPath(path: string, errorPositionOffset?: number): ParsedJsonPath;
/**
 * Converts parsed segments to a simple string array for backward compatibility.
 * Keys become their names, indices become their string representation.
 */
export declare function segmentsToStrings(segments: JsonPathSegment[]): string[];
/**
 * Validates a JSON path without returning the full parsed result.
 * Throws JsonPathParseError if the path is invalid.
 */
export declare function validateJsonPath(path: string, errorPositionOffset?: number): void;
