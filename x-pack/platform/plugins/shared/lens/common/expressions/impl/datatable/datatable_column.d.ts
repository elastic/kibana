import type { Direction } from '@elastic/eui';
import type { PaletteOutput, CustomPaletteParams, ColorMapping } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { ExpressionFunctionDefinition, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SortingHint } from '@kbn/lens-common';
import type { CollapseFunction } from '../../defs/collapse';
declare const LENS_DATATABLE_COLUMN = "lens_datatable_column";
export type LensGridDirection = 'none' | Direction;
export interface DatatableColumnConfig {
    columns: DatatableColumnResult[];
    sortingColumnId: string | undefined;
    sortingDirection: LensGridDirection;
}
export type DatatableColumnArgs = Omit<ColumnState, 'palette' | 'colorMapping'> & {
    palette?: PaletteOutput<CustomPaletteState>;
    colorMapping?: string;
    summaryRowValue?: unknown;
    sortingHint?: SortingHint;
};
export interface ColumnState {
    columnId: string;
    width?: number;
    hidden?: boolean;
    oneClickFilter?: boolean;
    isTransposed?: boolean;
    transposable?: boolean;
    originalColumnId?: string;
    originalName?: string;
    bucketValues?: Array<{
        originalBucketColumn: DatatableColumn;
        value: unknown;
    }>;
    alignment?: 'left' | 'right' | 'center';
    palette?: PaletteOutput<CustomPaletteParams>;
    colorMapping?: ColorMapping.Config;
    colorMode?: 'none' | 'cell' | 'text' | 'badge';
    summaryRow?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
    summaryLabel?: string;
    collapseFn?: CollapseFunction;
    isMetric?: boolean;
}
export type DatatableColumnResult = DatatableColumnArgs & {
    type: typeof LENS_DATATABLE_COLUMN;
};
export type DatatableColumnFn = ExpressionFunctionDefinition<typeof LENS_DATATABLE_COLUMN, null, DatatableColumnArgs, DatatableColumnResult>;
export declare const datatableColumn: DatatableColumnFn;
export {};
