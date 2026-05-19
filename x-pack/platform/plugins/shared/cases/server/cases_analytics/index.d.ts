import type { CoreSetup, ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CasesServerStartDependencies } from '../types';
import type { ConfigType } from '../config';
export declare const createCasesAnalyticsIndexes: ({ esClient, logger, isServerless, taskManager, savedObjectsClient, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    isServerless: boolean;
    taskManager: TaskManagerStartContract;
    savedObjectsClient: SavedObjectsClientContract;
}) => Promise<void>;
export declare function createCasesAnalyticsIndexesForSpaceId({ esClient, logger, isServerless, taskManager, spaceId, }: {
    spaceId: string;
    esClient: ElasticsearchClient;
    logger: Logger;
    isServerless: boolean;
    taskManager: TaskManagerStartContract;
}): Promise<unknown[]>;
export declare const registerCasesAnalyticsIndexesTasks: ({ taskManager, logger, core, analyticsConfig, }: {
    taskManager: TaskManagerSetupContract;
    logger: Logger;
    core: CoreSetup<CasesServerStartDependencies>;
    analyticsConfig: ConfigType["analytics"];
}) => void;
export declare const scheduleCasesAnalyticsSyncTasks: ({ taskManager, logger, spaceId, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    spaceId: string;
}) => void;
export declare const getIndicesForSpaceId: (spaceId: string) => string[];
