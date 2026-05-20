import React from 'react';
import { type CriteriaWithPagination } from '@elastic/eui';
import type { Agent, AgentPolicy } from '../../../../types';
import type { Pagination } from '../../../../hooks';
interface Props {
    agents: Agent[];
    isLoading: boolean;
    agentPoliciesIndexedById: Record<string, AgentPolicy>;
    renderActions: (a: Agent) => JSX.Element;
    sortField: keyof Agent;
    sortOrder: 'asc' | 'desc';
    onSelectionChange: (agents: Agent[]) => void;
    selected: Agent[];
    showUpgradeable: boolean;
    totalAgents?: number;
    pagination: Pagination;
    onTableChange: (criteria: CriteriaWithPagination<Agent>) => void;
    pageSizeOptions: number[];
    isUsingFilter: boolean;
    setEnrollmentFlyoutState: (value: React.SetStateAction<{
        isOpen: boolean;
        selectedPolicyId?: string | undefined;
    }>) => void;
    clearFilters: () => void;
    queryHasChanged: boolean;
}
export declare const AgentListTable: React.FC<Props>;
export {};
