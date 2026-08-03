import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
export type DateHistogramTextBasedExpressionFunction = ExpressionFunctionDefinition<'lens_date_histogram_textbased', Datatable, object, Datatable | Promise<Datatable>>;
