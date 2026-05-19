import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping, QueryDslQueryContainer, StoredScript } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
interface AnalyticsIndexParams {
    esClient: ElasticsearchClient;
    logger: Logger;
    indexName: string;
    indexAlias: string;
    indexVersion: number;
    isServerless: boolean;
    mappings: MappingTypeMapping;
    painlessScript: StoredScript;
    painlessScriptId: string;
    sourceIndex: string;
    sourceQuery: QueryDslQueryContainer;
    taskId: string;
    taskManager: TaskManagerStartContract;
}
export declare class AnalyticsIndex {
    private readonly logger;
    private readonly indexName;
    private readonly indexAlias;
    private readonly indexVersion;
    private readonly esClient;
    private readonly mappings;
    private readonly indexSettings?;
    private readonly painlessScriptId;
    private readonly painlessScript;
    private readonly retryService;
    private readonly taskManager;
    private readonly taskId;
    private readonly sourceIndex;
    private readonly sourceQuery;
    constructor({ logger, esClient, isServerless, indexName, indexAlias, indexVersion, mappings, painlessScriptId, painlessScript, taskManager, taskId, sourceIndex, sourceQuery, }: AnalyticsIndexParams);
    upsertIndex(): Promise<void>;
    private _upsertIndex;
    private updateIndexMapping;
    private getCurrentMapping;
    private updateMapping;
    private createIndexMapping;
    private indexExists;
    private shouldUpdateMapping;
    private putScript;
    private getMappingMeta;
    logDebug(message: string): void;
    private handleError;
    private scheduleBackfillTask;
}
export {};
