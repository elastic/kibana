import type { Agent, AgentPolicy } from '../../../types';
import type { MenuItem } from '../components/hierarchical_actions_menu';
/**
 * Callbacks interface for single-agent menu actions
 */
export interface SingleAgentMenuCallbacks {
    /** Optional - only used in table row to navigate to agent details */
    onViewAgentClick?: () => void;
    onAddRemoveTagsClick: (button: HTMLElement) => void;
    onReassignClick: () => void;
    onUpgradeClick: () => void;
    onViewAgentJsonClick: () => void;
    onViewAgentPolicyClick: () => void;
    onMigrateAgentClick: () => void;
    onRequestDiagnosticsClick: () => void;
    onChangeAgentPrivilegeLevelClick: () => void;
    onUnenrollClick: () => void;
    onUninstallClick: () => void;
    onRollbackClick: () => void;
    onRemoveCollectorClick?: () => void;
}
export interface UseSingleAgentMenuItemsOptions {
    agent: Agent;
    agentPolicy?: AgentPolicy;
    callbacks: SingleAgentMenuCallbacks;
}
/**
 * Hook to generate standardized menu items for single-agent actions.
 * Used by both table row actions and agent details page actions menu.
 */
export declare function useSingleAgentMenuItems({ agent, agentPolicy, callbacks, }: UseSingleAgentMenuItemsOptions): MenuItem[];
