import React from 'react';
import type { Agent } from '../../../../types';
import type { SelectionMode } from './types';
export declare const AgentsSelectionStatus: React.FunctionComponent<{
    totalAgents: number;
    totalManagedAgents: number;
    selectableAgents: number;
    managedAgentsOnCurrentPage: number;
    selectionMode: SelectionMode;
    setSelectionMode: (mode: SelectionMode) => void;
    selectedAgents: Agent[];
    setSelectedAgents: (agents: Agent[]) => void;
}>;
