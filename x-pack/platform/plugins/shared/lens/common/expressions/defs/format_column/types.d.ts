import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { FormatColumnArgs } from '.';
export type FormatColumnExpressionFunction = ExpressionFunctionDefinition<'lens_format_column', Datatable, FormatColumnArgs, Datatable | Promise<Datatable>>;
