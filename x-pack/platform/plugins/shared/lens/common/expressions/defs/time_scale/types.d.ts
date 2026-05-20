import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { TimeScaleUnit } from '@kbn/lens-common';
export interface TimeScaleArgs {
    inputColumnId: string;
    outputColumnId: string;
    targetUnit: TimeScaleUnit;
    dateColumnId?: string;
    outputColumnName?: string;
    reducedTimeRange?: string;
}
export type TimeScaleExpressionFunction = ExpressionFunctionDefinition<'lens_time_scale', Datatable, TimeScaleArgs, Promise<Datatable>>;
