import type { AgentAccessControlUpdateRequest } from '../../../../common/agents';
interface UseUpdateAgentAccessControlOptions {
    agentId: string;
    onSuccess?: () => void;
    onError?: (err: Error) => void;
}
export declare const useUpdateAgentAccessControl: ({ agentId, onSuccess, onError, }: UseUpdateAgentAccessControlOptions) => import("@tanstack/react-query").UseMutationResult<import("@kbn/agent-builder-common").AgentAccessControl, Error, AgentAccessControlUpdateRequest, unknown>;
export {};
