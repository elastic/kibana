import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class UpdateAgentTagsActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function updateTagsBatch(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, givenAgents: Agent[], outgoingErrors: Record<Agent['id'], Error>, options: {
    tagsToAdd: string[];
    tagsToRemove: string[];
    actionId?: string;
    total?: number;
    kuery?: string;
    retryCount?: number;
    spaceId?: string;
}): Promise<{
    actionId: string;
    updated?: number;
    took?: number;
}>;
