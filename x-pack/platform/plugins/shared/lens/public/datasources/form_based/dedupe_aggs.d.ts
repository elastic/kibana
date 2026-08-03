import type { ExpressionAstExpressionBuilder } from '@kbn/expressions-plugin/common';
import type { GenericOperationDefinition } from './operations';
import type { OriginalColumn } from './to_expression';
/**
 * Consolidates duplicate agg expression builders to increase performance
 */
export declare function dedupeAggs(_aggs: ExpressionAstExpressionBuilder[], _esAggsIdMap: Record<string, OriginalColumn[]>, aggExpressionToEsAggsIdMap: Map<ExpressionAstExpressionBuilder, string>, allOperations: GenericOperationDefinition[]): {
    aggs: ExpressionAstExpressionBuilder[];
    esAggsIdMap: Record<string, OriginalColumn[]>;
};
