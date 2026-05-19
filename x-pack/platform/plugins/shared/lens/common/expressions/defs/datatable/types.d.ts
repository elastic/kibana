import type { Datatable, DefaultInspectorAdapters, ExecutionContext, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { DatatableArgs } from './datatable';
export interface DatatableProps {
    data: Datatable;
    syncColors: boolean;
    untransposedData?: Datatable;
    args: DatatableArgs;
}
export interface DatatableRender {
    type: 'render';
    as: 'lens_datatable_renderer';
    value: DatatableProps;
}
export type DatatableExpressionFunction = ExpressionFunctionDefinition<'lens_datatable', Datatable, DatatableArgs, Promise<DatatableRender>, ExecutionContext<DefaultInspectorAdapters>>;
