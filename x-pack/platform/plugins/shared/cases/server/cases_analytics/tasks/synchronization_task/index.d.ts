import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import type { Owner } from '../../../../common/constants/types';
import type { CasesServerStartDependencies } from '../../../types';
export declare function registerCAISynchronizationTask({ taskManager, logger, core, analyticsConfig, }: {
    taskManager: TaskManagerSetupContract;
    logger: Logger;
    core: CoreSetup<CasesServerStartDependencies>;
    analyticsConfig: ConfigType['analytics'];
}): void;
export declare function getSynchronizationTaskId(spaceId: string, owner: Owner): string;
export declare function scheduleCAISynchronizationTask({ taskManager, logger, spaceId, owner, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    spaceId: string;
    owner: Owner;
}): Promise<void>;
