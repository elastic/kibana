import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare const VERIFY_PERMISSIONS_TASK = "[OTel Verify Permissions Task]";
export declare function registerVerifyPermissionsTask(taskManager: TaskManagerSetupContract): void;
export declare function scheduleVerifyPermissionsTask(taskManager: TaskManagerStartContract): Promise<void>;
