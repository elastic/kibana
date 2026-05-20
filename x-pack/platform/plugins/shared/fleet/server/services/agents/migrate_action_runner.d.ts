import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class MigrateActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function bulkMigrateAgentsBatch(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agents: Agent[], options: {
    actionId?: string;
    total?: number;
    spaceId?: string;
    enrollment_token?: string;
    uri?: string;
    settings?: Record<string, any>;
}): Promise<{
    actionId: string;
}>;
