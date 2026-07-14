import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
export declare const TASK_ID = "mark_removed_tasks_as_unrecognized";
export declare const SCHEDULE_INTERVAL = "1h";
export declare function scheduleMarkRemovedTasksAsUnrecognizedDefinition(logger: Logger, taskScheduling: TaskScheduling): Promise<void>;
export declare function registerMarkRemovedTasksAsUnrecognizedDefinition(logger: Logger, coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>, taskTypeDictionary: TaskTypeDictionary): void;
export declare function taskRunner(logger: Logger, coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>): () => {
    run(): Promise<{
        state: {};
        schedule: {
            interval: string;
        };
    }>;
};
