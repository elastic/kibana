import type { SignificantItem, SignificantItemGroup } from './types';
/**
 * Type guard for a significant item.
 * Note this is used as a custom type within Log Rate Analysis
 * for a p-value based variant, not a generic significant terms
 * aggregation type.
 * @param arg The unknown type to be evaluated
 * @returns Return whether arg is of type SignificantItem
 */
export declare function isSignificantItem(arg: unknown): arg is SignificantItem;
/**
 * Type guard to check if the given argument is a SignificantItemGroup.
 * @param arg The unknown type to be evaluated
 * @returns Return whether arg is of type SignificantItemGroup
 */
export declare function isSignificantItemGroup(arg: unknown): arg is SignificantItemGroup;
