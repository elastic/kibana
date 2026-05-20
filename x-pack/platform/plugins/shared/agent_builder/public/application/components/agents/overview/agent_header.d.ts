import React from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
export interface AgentHeaderProps {
    agent: AgentDefinition;
    docsUrl?: string;
    canEditAgent: boolean;
    onEditDetails: () => void;
}
export declare const AgentHeader: React.FC<AgentHeaderProps>;
