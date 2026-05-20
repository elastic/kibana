import type { Dispatch, SetStateAction } from 'react';
import type { EuiInMemoryTable, Direction, Pagination } from '@elastic/eui';
/**
 * Returned type for useTableState hook
 */
export interface UseTableState<T extends object> {
    /**
     * Callback function which gets called whenever the pagination or sorting state of the table changed
     */
    onTableChange: EuiInMemoryTable<T>['onTableChange'];
    /**
     * Pagination object which contains pageIndex, pageSize
     */
    pagination: Pagination;
    /**
     * Sort field and sort direction
     */
    sorting: {
        sort: {
            field: string;
            direction: Direction;
        };
    };
    /**
     * setPageIndex setter function which updates page index
     */
    setPageIndex: Dispatch<SetStateAction<number>>;
}
/**
 * Hook to help with managing the pagination and sorting for EuiInMemoryTable
 * @param {TableItem} items - data to show in the table
 * @param {string} initialSortField - field name to sort by default
 * @param {string} initialSortDirection - default to 'asc'
 */
export declare function useTableState<T extends object>(items: T[], initialSortField: string, initialSortDirection?: 'asc' | 'desc', initialPagionation?: Partial<Pagination>): {
    onTableChange: ({ page, sort }: import("@elastic/eui").Criteria<T>) => void;
    pagination: Pagination;
    sorting: {
        sort: {
            field: string;
            direction: Direction;
        };
    };
    setPageIndex: Dispatch<SetStateAction<number>>;
};
