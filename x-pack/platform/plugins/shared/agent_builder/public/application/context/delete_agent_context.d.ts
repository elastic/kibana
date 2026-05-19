import type { AgentDefinition } from '@kbn/agent-builder-common';
import React from 'react';
interface DeleteAgentState {
    deleteAgent: ({ agent, forceWithoutConfirmation, }: {
        agent: AgentDefinition;
        forceWithoutConfirmation?: boolean;
    }) => void;
}
interface DeleteAgentProviderProps {
    children: React.ReactNode;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}
export declare const DeleteAgentProvider: React.FC<DeleteAgentProviderProps>;
export declare function useDeleteAgent(): DeleteAgentState;
export {};
