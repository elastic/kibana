import type { Direction } from '@elastic/eui';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { DatatableColumnArgs, DatatableColumnResult } from '@kbn/lens-common';
declare const LENS_DATATABLE_COLUMN = "lens_datatable_column";
export type LensGridDirection = 'none' | Direction;
export interface DatatableColumnConfig {
    columns: DatatableColumnResult[];
    sortingColumnId: string | undefined;
    sortingDirection: LensGridDirection;
}
export type DatatableColumnFn = ExpressionFunctionDefinition<typeof LENS_DATATABLE_COLUMN, null, DatatableColumnArgs, DatatableColumnResult>;
export declare const datatableColumn: DatatableColumnFn;
export {};
