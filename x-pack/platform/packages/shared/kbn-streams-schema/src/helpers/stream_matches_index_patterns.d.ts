/**
 * Checks if a stream name matches any of the given glob-style index patterns.
 * Supports `*` (any characters) and `?` (single character) wildcards.
 */
export declare function streamMatchesIndexPatterns(streamName: string, indexPatterns: string[]): boolean;
