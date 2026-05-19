import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class UnenrollActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function isAgentUnenrolled(agent: Agent, revoke?: boolean): boolean;
export declare function unenrollBatch(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, givenAgents: Agent[], options: {
    force?: boolean;
    revoke?: boolean;
    actionId?: string;
    total?: number;
    spaceId?: string;
}): Promise<{
    actionId: string;
}>;
export declare function updateActionsForForceUnenroll(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentIds: string[], actionId: string, total: number): Promise<void>;
export declare function invalidateAPIKeysForAgents(agents: Agent[]): Promise<void>;
