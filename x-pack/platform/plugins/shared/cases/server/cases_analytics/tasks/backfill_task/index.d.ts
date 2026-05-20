import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ConfigType } from '../../../config';
import type { CasesServerStartDependencies } from '../../../types';
export declare function registerCAIBackfillTask({ taskManager, logger, core, analyticsConfig, }: {
    taskManager: TaskManagerSetupContract;
    logger: Logger;
    core: CoreSetup<CasesServerStartDependencies>;
    analyticsConfig: ConfigType['analytics'];
}): void;
export declare function scheduleCAIBackfillTask({ taskId, sourceIndex, sourceQuery, destIndex, taskManager, logger, }: {
    taskId: string;
    sourceIndex: string;
    sourceQuery: QueryDslQueryContainer;
    destIndex: string;
    taskManager: TaskManagerStartContract;
    logger: Logger;
}): Promise<void>;
