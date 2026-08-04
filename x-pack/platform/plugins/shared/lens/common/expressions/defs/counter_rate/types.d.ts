import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { CounterRateArgs } from '.';
export type CounterRateExpressionFunction = ExpressionFunctionDefinition<'lens_counter_rate', Datatable, CounterRateArgs, Datatable | Promise<Datatable>>;
