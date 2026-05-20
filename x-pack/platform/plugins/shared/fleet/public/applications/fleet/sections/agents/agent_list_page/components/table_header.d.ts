import React from 'react';
import type { Agent, SimplifiedAgentStatus } from '../../../../types';
import type { SelectionMode } from './types';
export declare const AgentTableHeader: React.FunctionComponent<{
    agentStatus?: {
        [k in SimplifiedAgentStatus]: number;
    };
    totalAgents: number;
    selectableAgents: number;
    totalManagedAgents: number;
    managedAgentsOnCurrentPage: number;
    selectionMode: SelectionMode;
    setSelectionMode: (mode: SelectionMode) => void;
    selectedAgents: Agent[];
    setSelectedAgents: (agents: Agent[]) => void;
    clearFilters: () => void;
    isUsingFilter: boolean;
}>;
