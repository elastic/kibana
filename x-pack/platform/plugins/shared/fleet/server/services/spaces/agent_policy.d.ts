import type { AgentPolicy } from '../../../common/types';
export declare function updateAgentPolicySpaces({ agentPolicy, currentSpaceId, authorizedSpaces, options, }: {
    agentPolicy: Pick<AgentPolicy, 'id' | 'name' | 'space_ids' | 'supports_agentless'>;
    currentSpaceId: string;
    authorizedSpaces: string[];
    options?: {
        force?: boolean;
    };
}): Promise<void>;
