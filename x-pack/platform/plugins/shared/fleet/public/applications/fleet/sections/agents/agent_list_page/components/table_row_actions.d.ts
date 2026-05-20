import React from 'react';
import type { Agent, AgentPolicy } from '../../../../types';
export declare const TableRowActions: React.FunctionComponent<{
    agent: Agent;
    agentPolicy?: AgentPolicy;
    onReassignClick: () => void;
    onUnenrollClick: () => void;
    onGetUninstallCommandClick: () => void;
    onUpgradeClick: () => void;
    onAddRemoveTagsClick: (button: HTMLElement) => void;
    onRequestDiagnosticsClick: () => void;
    onMigrateAgentClick: () => void;
    onChangeAgentPrivilegeLevelClick: () => void;
    onViewAgentJsonClick: () => void;
    onViewAgentPolicyClick: () => void;
    onRollbackClick: () => void;
    onRemoveCollectorClick?: () => void;
}>;
