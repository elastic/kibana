/**
 * Determine if condition filtering is enabled for a given condition block.
 * The filtering on a condition is enabled either if the condition is currently
 * selected, the condition itself is newly created, or it has at least one new descendant processor
 * in the current simulation.
 */
export declare function useConditionFilteringEnabled(conditionId: string): boolean;
