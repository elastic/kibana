export interface PatternSegment {
    type: 'static' | 'wildcard';
    value: string;
    index?: number;
}
/**
 * Groups segments into input groups where each group has:
 * - prepend: static text before the wildcard (if any)
 * - wildcardIndex: the index of the wildcard
 * - append: static text after the wildcard (if any, and only if it's the last wildcard)
 */
export interface InputGroup {
    prepend?: string;
    wildcardIndex: number;
    append?: string;
    isFirst: boolean;
    isLast: boolean;
}
/**
 * Normalizes an index pattern by collapsing consecutive wildcards into a single wildcard.
 * For example, 'logs-**' becomes 'logs-*' and '**-logs-**' becomes '*-logs-*'.
 * This is because consecutive wildcards are functionally equivalent to a single wildcard.
 * @param pattern The index pattern to normalize.
 * @returns The normalized pattern.
 */
export declare const normalizePattern: (pattern: string) => string;
/**
 * Parses the index pattern into a list of segments.
 * @param pattern The index pattern to parse.
 * @returns The list of segments.
 */
export declare const parseIndexPattern: (pattern: string) => PatternSegment[];
/**
 * Creates input groups from the segments.
 * @param segments The list of segments.
 * @returns The list of input groups.
 */
export declare const createInputGroups: (segments: PatternSegment[]) => InputGroup[];
/**
 * Counts the number of wildcards in the index pattern.
 * @param pattern The index pattern to count wildcards in.
 * @returns The number of wildcards.
 */
export declare const countWildcards: (pattern: string) => number;
/**
 * Builds the stream name from the index pattern and the parts.
 * @param pattern The index pattern to build the stream name from.
 * @param parts The parts to build the stream name from.
 * @returns The stream name.
 */
export declare const buildStreamName: (pattern: string, parts: string[]) => string;
