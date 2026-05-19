import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import type { CasesServerStartDependencies } from '../../../types';
export declare function registerCAISchedulerTask({ taskManager, logger, core, analyticsConfig, }: {
    taskManager: TaskManagerSetupContract;
    logger: Logger;
    core: CoreSetup<CasesServerStartDependencies>;
    analyticsConfig: ConfigType['analytics'];
}): void;
export declare function scheduleCAISchedulerTask({ taskManager, logger, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
}): Promise<void>;
