import React from 'react';
import type { Agent, AgentPolicy } from '../../../../types';
import type { SelectionMode } from './types';
export interface Props {
    nAgentsInTable: number;
    totalManagedAgentIds: string[];
    selectionMode: SelectionMode;
    currentQuery: string;
    selectedAgents: Agent[];
    agentsOnCurrentPage: Agent[];
    refreshAgents: (args?: {
        refreshTags?: boolean;
    }) => void;
    allTags: string[];
    agentPolicies: AgentPolicy[];
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    unsupportedMigrateAgents: Agent[];
    unsupportedPrivilegeLevelChangeAgents: Agent[];
}
export declare const AgentBulkActions: React.FunctionComponent<Props>;
