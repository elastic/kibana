import type { BulkOperationParams } from '../services/rules_api';
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
    getBulkParams: () => BulkOperationParams;
};
export {};
