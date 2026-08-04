import type { DefaultInspectorAdapters, ExecutionContext, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ChoroplethChartConfig, ChoroplethChartProps } from './types';
interface ChoroplethChartRender {
    type: 'render';
    as: 'lens_choropleth_chart_renderer';
    value: ChoroplethChartProps;
}
export declare const getExpressionFunction: () => ExpressionFunctionDefinition<"lens_choropleth_chart", Datatable, Omit<ChoroplethChartConfig, "layerType">, ChoroplethChartRender, ExecutionContext<DefaultInspectorAdapters>>;
export {};
