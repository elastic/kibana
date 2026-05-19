import type { Logger, CoreSetup } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract, IntervalSchedule } from '@kbn/task-manager-plugin/server';
export declare const USER_CONNECTOR_TOKEN_CLEANUP_TASK_TYPE = "actions:user_connector_token_cleanup";
export declare const USER_CONNECTOR_TOKEN_CLEANUP_TASK_ID = "Actions-actions:user_connector_token_cleanup";
export declare const USER_CONNECTOR_TOKEN_CLEANUP_SCHEDULE: IntervalSchedule;
export declare function initializeUserConnectorTokenCleanupTask(logger: Logger, taskManager: TaskManagerSetupContract, core: CoreSetup): void;
export declare function scheduleUserConnectorTokenCleanupTask(logger: Logger, taskManager: TaskManagerStartContract): void;
