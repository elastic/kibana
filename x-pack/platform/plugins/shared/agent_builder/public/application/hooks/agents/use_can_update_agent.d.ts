import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentPermissions } from '../../../../common/http_api/agents';
type AgentWithOptionalPermissions = AgentDefinition & {
    permissions?: AgentPermissions;
};
export declare const useCanUpdateAgent: ({ agent, }: {
    agent: AgentWithOptionalPermissions | null;
}) => boolean;
export {};
