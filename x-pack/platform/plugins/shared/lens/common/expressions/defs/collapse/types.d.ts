import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { CollapseArgs } from '.';
export type CollapseExpressionFunction = ExpressionFunctionDefinition<'lens_collapse', Datatable, CollapseArgs, Datatable | Promise<Datatable>>;
