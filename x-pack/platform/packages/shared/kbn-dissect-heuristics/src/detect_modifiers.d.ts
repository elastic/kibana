import type { DissectField, DissectModifiers } from './types';
/**
 * Detect if a field needs the right padding modifier (->)
 * Right padding handles variable trailing whitespace
 */
export declare function detectRightPadding(values: string[]): boolean;
/**
 * Determine if a field should be skipped
 * Skip fields are either:
 * 1. All values are identical and match common "empty" patterns
 * 2. All values are the same (optional named skip)
 */
export declare function shouldSkipField(values: string[], useNamedSkip?: boolean): boolean;
/**
 * Detect all modifiers for a field
 */
export declare function detectModifiers(field: DissectField): DissectModifiers;
