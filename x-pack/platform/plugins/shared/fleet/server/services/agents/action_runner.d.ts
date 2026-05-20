import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import type { RetryParams } from './retry_helper';
export interface ActionParams {
    kuery: string;
    showInactive?: boolean;
    batchSize?: number;
    total?: number;
    actionId?: string;
    spaceId?: string;
    [key: string]: any;
}
export declare abstract class ActionRunner {
    protected esClient: ElasticsearchClient;
    protected soClient: SavedObjectsClientContract;
    protected actionParams: ActionParams;
    protected retryParams: RetryParams;
    private bulkActionsResolver?;
    private checkTaskId?;
    constructor(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, actionParams: ActionParams, retryParams: RetryParams);
    protected abstract getActionType(): string;
    protected abstract getTaskType(): string;
    protected abstract processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    runActionAsyncTask(): Promise<{
        actionId: string;
    }>;
    /**
     * Common runner logic accross all agent bulk actions
     * Starts action execution immeditalely, asynchronously
     * On errors, starts a task with Task Manager to retry max 3 times
     * If the last batch was stored in state, retry continues from there (searchAfter)
     */
    runActionAsyncWithRetry(): Promise<{
        actionId: string;
    }>;
    private createCheckResultTask;
    private processBatch;
    processAgentsInBatches(): Promise<{
        actionId: string;
    }>;
}
