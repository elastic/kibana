import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare function registerReindexIntegrationKnowledgeTask(taskManagerSetup: TaskManagerSetupContract): void;
export declare function scheduleReindexIntegrationKnowledgeTask(taskManagerStart: TaskManagerStartContract): Promise<void>;
export declare function reindexIntegrationKnowledgeForInstalledPackages(abortController: AbortController): Promise<void>;
