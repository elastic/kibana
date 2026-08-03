import type { ViewToggleId } from '../../common/constants';
import type { SortFieldCase, SortOrder } from '../../common/ui/types';
import type { FilterDimension } from './get_active_filter_dimensions';
/**
 * Events Based Tracking for switching between the cases list "list" and "table" view modes
 */
export declare const useCasesListViewModeChangedEBT: () => (viewMode: ViewToggleId) => void;
export interface UseCasesListPageViewEBTArgs {
    /** The active view mode ("list" or "table") at the time the page loaded */
    viewMode: ViewToggleId;
    /** The columns (table view) or fields (list view) currently selected for display */
    selectedColumns: string[];
    /** The number of rows selected per page */
    perPage: number;
    /** The case field the list is sorted by at load time */
    sortField: SortFieldCase;
    /** The sort direction at load time */
    sortOrder: SortOrder;
    /** The bounded set of filter dimensions that are actively applied at load time */
    activeFilterDimensions: FilterDimension[];
    /** Whether asynchronously loaded list configuration is ready to report */
    isReady?: boolean;
    /**
     * Set to `false` to skip reporting, e.g. when the list is rendered inside the
     * "add to existing case" selector modal rather than as the main cases list page.
     */
    enabled?: boolean;
}
/**
 * Events Based Tracking for the cases list page load. Reports the view mode, selected
 * columns/fields, sorting, active filter dimensions, and page size that were active at load
 * time.
 */
export declare const useCasesListPageViewEBT: ({ viewMode, selectedColumns, perPage, sortField, sortOrder, activeFilterDimensions, isReady, enabled, }: UseCasesListPageViewEBTArgs) => void;
