import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { DataGridDensity, PagingState, RowHeightMode, SortingState } from '@kbn/lens-common';
import type { FormatFactory } from '../../../types';
import type { DatatableColumnResult } from '../../impl/datatable/datatable_column';
import type { DatatableExpressionFunction } from './types';
export interface DatatableArgs {
    title: string;
    description?: string;
    columns: DatatableColumnResult[];
    sortingColumnId: SortingState['columnId'];
    sortingDirection: SortingState['direction'];
    fitRowToContent?: boolean;
    rowHeightLines?: number;
    headerRowHeight?: RowHeightMode;
    headerRowHeightLines?: number;
    pageSize?: PagingState['size'];
    density?: DataGridDensity;
    showRowNumbers?: boolean;
}
/**
 * Available datatables logged to inspector
 */
export declare const DatatableInspectorTables: {
    Default: string;
    Transpose: string;
};
export declare const getDatatable: (getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>) => DatatableExpressionFunction;
