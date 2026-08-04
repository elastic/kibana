import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
export type ExpressionFunctionFormulaTimeRange = ExpressionFunctionDefinition<'formula_time_range', undefined, object, number>;
export declare const formulaTimeRangeFn: ExpressionFunctionFormulaTimeRange;
export type ExpressionFunctionFormulaInterval = ExpressionFunctionDefinition<'formula_interval', undefined, {
    targetBars?: number;
}, number>;
export declare const formulaIntervalFn: ExpressionFunctionFormulaInterval;
export type ExpressionFunctionFormulaNow = ExpressionFunctionDefinition<'formula_now', undefined, object, number>;
export declare const formulaNowFn: ExpressionFunctionFormulaNow;
