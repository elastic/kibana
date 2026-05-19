import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentPolicy } from '../../common';
export declare function agentPolicyUpdateEventHandler(esClient: ElasticsearchClient, action: string, agentPolicyId: string, options?: {
    skipDeploy?: boolean;
    spaceId?: string;
    agentPolicy?: AgentPolicy | null;
}): Promise<void>;
