import React from 'react';
interface AgentSelectorProps {
    agentId: string;
    getNavigationPath: (newAgentId: string) => string;
}
export declare const AgentSelector: React.FC<AgentSelectorProps>;
export {};
