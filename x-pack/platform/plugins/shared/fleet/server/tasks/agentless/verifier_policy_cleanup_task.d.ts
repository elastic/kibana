import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare const CLEANUP_TASK_LOG = "[OTel Permission Verifier Cleanup Task]";
export declare function registerVerifierPolicyCleanupTask(taskManager: TaskManagerSetupContract): void;
export declare function scheduleVerifierPolicyCleanupTask(taskManager: TaskManagerStartContract): Promise<void>;
