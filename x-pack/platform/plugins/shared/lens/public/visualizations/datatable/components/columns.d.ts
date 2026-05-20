import type { EuiDataGridColumn } from '@elastic/eui';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { LensCellValueAction, RowHeightMode } from '@kbn/lens-common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
export declare const createGridColumns: (bucketColumns: string[], table: Datatable, handleFilterClick: ((field: string, value: unknown, colIndex: number, rowIndex: number, negate?: boolean) => void) | undefined, handleTransposedColumnClick: ((bucketValues: Array<{
    originalBucketColumn: DatatableColumn;
    value: unknown;
}>, negate?: boolean) => void) | undefined, columnConfig: DatatableColumnConfig, visibleColumns: string[], formatFactory: FormatFactory, onColumnResize: (eventData: {
    columnId: string;
    width: number | undefined;
}) => void, onColumnHide: ((eventData: {
    columnId: string;
}) => void) | undefined, alignments: Map<string, "left" | "right" | "center">, headerRowHeight: RowHeightMode, headerRowLines: number, columnCellValueActions: LensCellValueAction[][] | undefined, closeCellPopover?: Function, columnFilterable?: boolean[]) => EuiDataGridColumn[];
