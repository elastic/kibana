import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
export declare const TASK_ID = "delete_inactive_background_task_nodes";
export declare const CLEANUP_INTERVAL = "1m";
export declare const CLEANUP_LOOKBACK = "5m";
export declare function scheduleDeleteInactiveNodesTaskDefinition(logger: Logger, taskScheduling: TaskScheduling): Promise<void>;
export declare function registerDeleteInactiveNodesTaskDefinition(logger: Logger, coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>, taskTypeDictionary: TaskTypeDictionary): void;
export declare function taskRunner(logger: Logger, coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>): () => {
    run(): Promise<{
        state: {};
        schedule: {
            interval: string;
        };
    }>;
};
