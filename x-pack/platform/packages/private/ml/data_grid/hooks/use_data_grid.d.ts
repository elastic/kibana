import type { EuiDataGridColumn } from '@elastic/eui';
import type { UseDataGridReturnType } from '../lib/types';
/**
 * Custom hook to manage DataGrid state.
 *
 * @param {EuiDataGridColumn[]} columns - EUI column spec
 * @param {number} [defaultPageSize=5] - Default page size
 * @param {number} [defaultVisibleColumnsCount=INIT_MAX_COLUMNS] - Default count of visible columns
 * @param {?(id: string) => boolean} [defaultVisibleColumnsFilter] - Optional external columns filter
 * @returns {UseDataGridReturnType}
 */
export declare const useDataGrid: (columns: EuiDataGridColumn[], defaultPageSize?: number, defaultVisibleColumnsCount?: number, defaultVisibleColumnsFilter?: (id: string) => boolean) => UseDataGridReturnType;
