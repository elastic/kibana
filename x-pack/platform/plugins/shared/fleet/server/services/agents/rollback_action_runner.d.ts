import type { ElasticsearchClient } from '@kbn/core/server';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class RollbackActionRunner extends ActionRunner {
    private allActionIds;
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    processAgentsInBatches(): Promise<{
        actionId: string;
    }>;
    getAllActionIds(): string[];
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function rollbackBatch(esClient: ElasticsearchClient, givenAgents: Agent[], outgoingErrors: Record<Agent['id'], Error>, options: {
    actionId?: string;
    total?: number;
    spaceIds?: string[];
}, spaceIds?: string[]): Promise<{
    actionIds: string[];
}>;
