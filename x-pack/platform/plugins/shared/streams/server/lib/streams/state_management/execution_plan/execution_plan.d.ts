import type { StateDependencies } from '../types';
import type { ActionsByType, ElasticsearchAction } from './types';
/**
 * This class takes a list of ElasticsearchActions and groups them by type.
 * It then tries to plan these actions to make the least amount of changes to Elasticsearch resources
 * The execution of the plan aims to be as parallel as possible while still respecting the order of operations
 * to avoid any data loss
 */
export declare class ExecutionPlan {
    private dependencies;
    private actionsByType;
    constructor(dependencies: StateDependencies);
    plan(elasticsearchActions: ElasticsearchAction[]): Promise<void>;
    plannedActions(): ActionsByType;
    validatePermissions(): Promise<true | undefined>;
    execute(): Promise<void>;
    private deleteQueries;
    private unlinkAssets;
    private unlinkSystems;
    private unlinkFeatures;
    private upsertComponentTemplates;
    private upsertIndexTemplates;
    private rollover;
    private updateDefaultIngestPipeline;
    private updateLifecycle;
    private updateDataStreamMappingsAndRollover;
    private upsertDatastreams;
    private upsertIngestPipelines;
    private deleteDatastreams;
    private deleteIndexTemplates;
    private updateFailureStore;
    private deleteIngestPipelines;
    private deleteComponentTemplates;
    private upsertAndDeleteDotStreamsDocuments;
    private updateIngestSettings;
    private upsertEsqlViews;
    private deleteEsqlViews;
}
