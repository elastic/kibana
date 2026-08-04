import React from 'react';
import { type AgentDefinition } from '@kbn/agent-builder-common';
interface AccessSummaryCardProps {
    agent: AgentDefinition;
    onManage: () => void;
}
export declare const AccessSummaryCard: React.FC<AccessSummaryCardProps>;
export {};
