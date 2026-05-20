export declare const dissectKeyLeftModifiers: readonly ["+", "?", "*", "&"];
export declare const dissectKeyRightModifiers: readonly ["->"];
export declare const dissectKeyModifiers: readonly ["+", "?", "*", "&", "->"];
/**
 * A type representing a single-character left-side modifier.
 */
export type DissectKeyLeftModifier = (typeof dissectKeyLeftModifiers)[number];
export declare function isDissectKeyLeftModifier(char: string): char is DissectKeyLeftModifier;
/**
 * A type representing the supported dissect key modifiers.
 * Includes generic '/n' order specification for append ordering.
 */
export type DissectKeyModifier = (typeof dissectKeyModifiers)[number] | `/${number}`;
/**
 * Common data types supported by both DISSECT and GROK
 */
export declare const dissectGrokESQLDataTypes: readonly ["keyword", "int", "long", "float"];
/**
 * A type representing the common data types
 */
export type DissectGrokESQLDataTypes = (typeof dissectGrokESQLDataTypes)[number];
/**
 * Interface representing a field extracted from a pattern (DISSECT or GROK)
 */
export interface DissectGrokPatternField {
    name: string;
    type: DissectGrokESQLDataTypes;
}
/**
 * Result of parsing multiple patterns, with fields grouped by pattern
 */
export interface PatternParseResult {
    allFields: DissectGrokPatternField[];
    fieldsByPattern: DissectGrokPatternField[][];
}
