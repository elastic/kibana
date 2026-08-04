/**
 * Fetches access control for an agent. Callers without management rights receive redacted entries.
 */
export declare const useAgentAccessControl: (agentId: string, { enabled }?: {
    enabled?: boolean;
}) => import("@tanstack/react-query").UseQueryResult<import("../../../../common/http_api/agents").GetAgentAccessControlResponse, unknown>;
