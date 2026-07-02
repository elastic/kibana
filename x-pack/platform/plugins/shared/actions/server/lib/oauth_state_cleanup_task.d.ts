import type { Logger, CoreSetup } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract, IntervalSchedule } from '@kbn/task-manager-plugin/server';
import type { ActionsPluginsStart } from '../plugin';
export declare const OAUTH_STATE_CLEANUP_TASK_TYPE = "actions:oauth_state_cleanup";
export declare const OAUTH_STATE_CLEANUP_TASK_ID = "Actions-actions:oauth_state_cleanup";
export declare const OAUTH_STATE_CLEANUP_SCHEDULE: IntervalSchedule;
export declare function initializeOAuthStateCleanupTask(logger: Logger, taskManager: TaskManagerSetupContract, core: CoreSetup<ActionsPluginsStart>): void;
export declare function scheduleOAuthStateCleanupTask(logger: Logger, taskManager: TaskManagerStartContract): void;
