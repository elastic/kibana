import type { CollapseExpressionFunction } from './types';
export type CollapseFunction = 'sum' | 'avg' | 'min' | 'max';
export interface CollapseArgs {
    by?: string[];
    metric?: string[];
    fn: CollapseFunction[];
}
export type { CollapseExpressionFunction };
/**
 * Collapses multiple rows into a single row using the specified function.
 *
 * The `by` argument specifies the columns to group by - these columns are not collapsed.
 * The `metric` arguments specifies the collumns to apply the aggregate function to.
 *
 * All other columns are removed.
 */
export declare const collapse: CollapseExpressionFunction;
