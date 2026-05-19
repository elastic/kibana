import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { DataType } from '@kbn/lens-common';
export type OriginalColumn = {
    id: string;
    label: string;
    variable?: string;
    format?: SerializedFieldFormat;
    dataType?: DataType;
    customLabel?: boolean;
} & ({
    operationType: 'date_histogram';
    sourceField: string;
    interval: number;
} | {
    operationType: string;
    sourceField?: string;
    interval: never;
});
export type MapToColumnsExpressionFunction = ExpressionFunctionDefinition<'lens_map_to_columns', Datatable, {
    idMap: string;
    isTextBased?: boolean;
}, Datatable | Promise<Datatable>>;
