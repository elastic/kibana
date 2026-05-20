import React from 'react';
import type { Agent, AgentPolicy } from '../../../../types';
import type { SelectionMode } from './types';
export interface SearchAndFilterBarProps {
    agentPolicies: AgentPolicy[];
    draftKuery: string;
    onDraftKueryChange: (kuery: string) => void;
    onSubmitSearch: (kuery: string) => void;
    selectedAgentPolicies: string[];
    onSelectedAgentPoliciesChange: (selectedPolicies: string[]) => void;
    selectedStatus: string[];
    onSelectedStatusChange: (selectedStatus: string[]) => void;
    showUpgradeable: boolean;
    onShowUpgradeableChange: (showUpgradeable: boolean) => void;
    tags: string[];
    selectedTags: string[];
    onSelectedTagsChange: (selectedTags: string[]) => void;
    nAgentsInTable: number;
    totalInactiveAgents: number;
    totalManagedAgentIds: string[];
    selectionMode: SelectionMode;
    currentQuery: string;
    selectedAgents: Agent[];
    refreshAgents: (args?: {
        refreshTags?: boolean;
    }) => void;
    onClickAddAgent: () => void;
    onClickAddFleetServer: () => void;
    onClickAddCollector: () => void;
    agentsOnCurrentPage: Agent[];
    onClickAgentActivity: () => void;
    shouldShowAgentActivityTour?: boolean;
    latestAgentActionErrors: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    unsupportedMigrateAgents: Agent[];
    unsupportedPrivilegeLevelChangeAgents: Agent[];
}
export declare const SearchAndFilterBar: React.FunctionComponent<SearchAndFilterBarProps>;
