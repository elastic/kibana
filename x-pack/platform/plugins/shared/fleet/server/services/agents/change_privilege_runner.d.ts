import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import type { AgentPrivilegeLevelChangeUserInfo } from '../../../common/types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class ChangePrivilegeActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function bulkChangePrivilegeAgentsBatch(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agents: Agent[], options: {
    actionId?: string;
    total?: number;
    spaceId?: string;
    user_info?: AgentPrivilegeLevelChangeUserInfo;
}): Promise<{
    actionId: string;
}>;
