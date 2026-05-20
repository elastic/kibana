import type { ElasticsearchClient } from '@kbn/core/server';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class ReassignActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function reassignBatch(esClient: ElasticsearchClient, options: {
    newAgentPolicyId: string;
    actionId?: string;
    total?: number;
    spaceId?: string;
}, givenAgents: Agent[], outgoingErrors: Record<Agent['id'], Error>): Promise<{
    actionId: string;
}>;
