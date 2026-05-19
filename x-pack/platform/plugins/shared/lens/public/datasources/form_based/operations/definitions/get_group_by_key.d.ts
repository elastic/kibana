import type { ExpressionAstExpressionBuilder } from '@kbn/expressions-plugin/common';
import type { Primitive } from 'utility-types';
export declare function groupByKey<T>(items: T[], getKey: (item: T) => string | undefined): Record<string, T[]>;
/**
 * Computes a group-by key for an agg expression builder based on distinctive expression function arguments
 */
export declare const getGroupByKey: (agg: ExpressionAstExpressionBuilder, aggNames: string[], importantExpressionArgs: Array<{
    name: string;
    transformer?: (value: Primitive) => string;
}>) => string | undefined;
