import React from 'react';
import { type Criteria } from '@elastic/eui';
import type { RuleApiResponse } from '../../services/rules_api';
export type RulesListTableSortField = 'kind' | 'enabled' | 'metadata';
export interface RulesListTableProps {
    items: RuleApiResponse[];
    totalItemCount: number;
    page: number;
    perPage: number;
    search: string;
    hasActiveFilters: boolean;
    sortField?: RulesListTableSortField;
    sortDirection?: 'asc' | 'desc';
    isLoading: boolean;
    /** Bulk selection state */
    selectedCount: number;
    isAllSelected: boolean;
    isPageSelected: boolean;
    isRowSelected: (id: string) => boolean;
    onSelectRow: (id: string) => void;
    onSelectPage: () => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    /** Bulk action callbacks */
    onBulkEnable: () => void;
    onBulkDisable: () => void;
    onBulkDelete: () => void;
    /** Row action callbacks */
    onNavigateToDetails: (rule: RuleApiResponse) => void;
    onExpand: (rule: RuleApiResponse) => void;
    onQuickEdit: (rule: RuleApiResponse) => void;
    onEdit: (rule: RuleApiResponse) => void;
    onClone: (rule: RuleApiResponse) => void;
    onDelete: (rule: RuleApiResponse) => void;
    onToggleEnabled: (rule: RuleApiResponse) => void;
    /** Pagination callback */
    onTableChange: (criteria: Criteria<RuleApiResponse>) => void;
}
export declare const RulesListTable: React.FC<RulesListTableProps>;
