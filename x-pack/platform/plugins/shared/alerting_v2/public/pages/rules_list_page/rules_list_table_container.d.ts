import React from 'react';
import type { Criteria } from '@elastic/eui';
import type { RuleApiResponse } from '../../services/rules_api';
import { type RulesListTableSortField } from './rules_list_table';
export interface RulesListTableContainerProps {
    items: RuleApiResponse[];
    totalItemCount: number;
    page: number;
    perPage: number;
    search: string;
    /** Facet filter KQL passed to list-rules; scopes select-all bulk actions. */
    filter?: string;
    hasActiveFilters: boolean;
    sortField?: RulesListTableSortField;
    sortDirection?: 'asc' | 'desc';
    isLoading: boolean;
    onTableChange: (criteria: Criteria<RuleApiResponse>) => void;
    onEditInFlyout: (rule: RuleApiResponse) => void;
    onCloneInFlyout: (rule: RuleApiResponse) => void;
}
export declare const RulesListTableContainer: React.FC<RulesListTableContainerProps>;
