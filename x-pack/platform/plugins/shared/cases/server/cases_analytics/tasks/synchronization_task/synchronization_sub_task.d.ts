import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Owner } from '../../../../common/constants/types';
import { type CAISyncType } from '../../constants';
interface SynchronizationTaskState {
    lastSyncSuccess?: Date | undefined;
    lastSyncAttempt?: Date | undefined;
    esReindexTaskId?: TaskId | undefined;
    syncType?: CAISyncType;
}
export declare class SynchronizationSubTaskRunner {
    private readonly sourceIndex;
    private readonly destIndex;
    private readonly owner;
    private readonly spaceId;
    private readonly syncType;
    private readonly esClient;
    private readonly logger;
    private readonly errorSource;
    private readonly esReindexTaskId;
    private lastSyncSuccess;
    private lastSyncAttempt;
    constructor({ esReindexTaskId, lastSyncSuccess, lastSyncAttempt, sourceIndex, destIndex, owner, spaceId, syncType, esClient, logger, }: {
        esReindexTaskId?: TaskId;
        lastSyncSuccess?: string;
        lastSyncAttempt?: string;
        sourceIndex: string;
        destIndex: string;
        owner: Owner;
        spaceId: string;
        syncType: CAISyncType;
        esClient: ElasticsearchClient;
        logger: Logger;
    });
    run(): Promise<SynchronizationTaskState | undefined>;
    private updateLastSyncTimes;
    /**
     * This method does a call to elasticsearch that reindexes from this.destIndex
     * to this.sourceIndex. The query used takes into account the lastSyncSuccess
     * and lastSyncAttempt values in the class.
     *
     * @returns {SynchronizationTaskState} The updated task state
     */
    private synchronizeIndex;
    private getPreviousReindexStatus;
    private buildSourceQuery;
    private getSyncState;
    private getMapping;
    private getPainlessScript;
    private getPainlessScriptId;
    private isIndexAvailable;
    logDebug(message: string): void;
    handleErrorMessage(message: string): string;
    cancel(): Promise<void>;
}
export {};
