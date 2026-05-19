import type { Ast } from '@kbn/interpreter';
import type { UnifiedAxisExtentConfig } from './types';
declare const CHART_TO_FN_NAME: {
    readonly xy: "axisExtentConfig";
};
export declare const axisExtentConfigToExpression: (extent: UnifiedAxisExtentConfig | undefined, chartType?: keyof typeof CHART_TO_FN_NAME) => Ast;
export {};
