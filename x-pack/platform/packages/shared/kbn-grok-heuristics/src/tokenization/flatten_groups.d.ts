import type { GrokPatternGroup, GrokPatternNode } from '../types';
/**
 * Flattens an array of `NamedColumn` objects into a single list of `NamedToken` objects.
 * Handles whitespace and delimiter characters by inlining them as tokens, ensuring
 * proper GROK pattern construction. Adjusts leading and trailing whitespace based on
 * column properties and the specified delimiter.
 *
 * @param columns - The array of `NamedColumn` objects to flatten.
 * @param delimiter - The delimiter string to use between columns.
 * @returns A flattened array of `NamedToken` objects.
 */
export declare function flattenGroups(columns: GrokPatternGroup[], delimiter: string): GrokPatternNode[];
