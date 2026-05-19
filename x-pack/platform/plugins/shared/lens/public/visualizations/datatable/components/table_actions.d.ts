import type { EuiDataGridColumn, EuiDataGridSchemaDetector, EuiDataGridSorting } from '@elastic/eui';
import type { Datatable, DatatableColumn, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { ClickTriggerEvent } from '@kbn/charts-plugin/public';
import type { LensResizeAction, LensSortAction, LensToggleAction } from '@kbn/lens-common';
import type { DatatableColumnConfig, LensGridDirection } from '../../../../common/expressions';
import type { FormatFactory } from '../../../../common/types';
export declare const createGridResizeHandler: (columnConfig: DatatableColumnConfig, setColumnConfig: React.Dispatch<React.SetStateAction<DatatableColumnConfig>>, onEditAction: (data: LensResizeAction["data"]) => void) => (eventData: {
    columnId: string;
    width: number | undefined;
}) => void;
export declare const createGridHideHandler: (columnConfig: DatatableColumnConfig, setColumnConfig: React.Dispatch<React.SetStateAction<DatatableColumnConfig>>, onEditAction: (data: LensToggleAction["data"]) => void) => (eventData: {
    columnId: string;
}) => void;
export declare const createGridFilterHandler: (tableRef: React.MutableRefObject<Datatable>, onClickValue: (data: ClickTriggerEvent["data"]) => void) => (_field: string, value: unknown, colIndex: number, rowIndex: number, negate?: boolean) => void;
export declare const createTransposeColumnFilterHandler: (onClickValue: (data: ClickTriggerEvent["data"]) => void, untransposedDataRef: React.MutableRefObject<Datatable | undefined>) => (bucketValues: Array<{
    originalBucketColumn: DatatableColumn;
    value: unknown;
}>, negate?: boolean) => void;
export declare const createGridSortingConfig: (sortBy: string | undefined, sortDirection: LensGridDirection, onEditAction: (data: LensSortAction["data"]) => void) => EuiDataGridSorting;
export declare function getSimpleColumnType(meta?: DatatableColumnMeta): "range" | import("@kbn/expressions-plugin/common").DatatableColumnType | undefined;
export declare const buildSchemaDetectors: (columns: EuiDataGridColumn[], columnConfig: DatatableColumnConfig, table: Datatable, formatters: Record<string, ReturnType<FormatFactory>>) => EuiDataGridSchemaDetector[];
