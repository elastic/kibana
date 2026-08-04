import React, { type ReactNode } from 'react';
import { type CriteriaWithPagination } from '@elastic/eui';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
interface Props {
    items: PolicyExecutionHistoryItem[];
    loading: boolean;
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    onChange: (criteria: CriteriaWithPagination<PolicyExecutionHistoryItem>) => void;
    onPolicyClick: (policyId: string) => void;
    onRuleClick?: (ruleId: string) => void;
    activeRuleId?: string | null;
    noItemsMessage: ReactNode;
    showEpisodeColumns?: boolean;
    showRulesColumn?: boolean;
    tableCaption?: string;
}
export declare const PoliciesExecutionHistoryTable: ({ items, loading, pageIndex, pageSize, totalItemCount, onChange, onPolicyClick, onRuleClick, activeRuleId, noItemsMessage, showEpisodeColumns, showRulesColumn, tableCaption, }: Props) => React.JSX.Element;
export {};
