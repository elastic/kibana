import type { BulkByIdsParams, BulkByQueryParams } from '../services/rules_api';
/**
 * Discriminated union returned by {@link useBulkSelect}'s `getBulkParams`.
 * `mode: 'by_ids'` targets the by-ID endpoints; `mode: 'by_query'` targets
 * the by-query endpoints (which the caller must invoke with `force: true`
 * when executing rather than previewing).
 */
export type BulkSelection = ({
    mode: 'by_ids';
} & BulkByIdsParams) | ({
    mode: 'by_query';
} & Omit<BulkByQueryParams, 'force'>);
interface UseBulkSelectProps {
    /** Total number of rules across all pages. */
    totalItemCount: number;
    /** The visible page of items. */
    items: Array<{
        id: string;
    }>;
    /** Facet filter KQL, same as list-rules `filter` query param. */
    filter?: string;
    /** Debounced search string, same as list-rules `search` query param. */
    search?: string;
}
export declare const useBulkSelect: ({ totalItemCount, items, filter, search }: UseBulkSelectProps) => {
    isAllSelected: boolean;
    selectedCount: number;
    isPageSelected: boolean;
    isRowSelected: (ruleId: string) => boolean;
    onSelectRow: (ruleId: string) => void;
    onSelectAll: () => void;
    onSelectPage: () => void;
    onClearSelection: () => void;
    getBulkParams: () => BulkSelection;
};
export {};
