import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentPermissions } from '../../../../common/http_api/agents';
type AgentWithOptionalPermissions = AgentDefinition & {
    permissions?: AgentPermissions;
};
/**
 * Returns whether the current user is allowed to view and edit an agent's access control.
 *
 * ACL entry edits can grant higher permissions, so they use the same Manager-level
 * authorization check as access-control mode changes.
 *
 * Returns `false` while the current user is still loading to avoid flashing incorrect actions.
 */
export declare const useCanUpdateAgentAccess: (agent: AgentWithOptionalPermissions | null | undefined) => {
    canUpdate: boolean;
    isLoading: boolean;
};
export {};
