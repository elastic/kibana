import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export interface SyncNamespaceTemplatesTaskParams {
    spaceId: string;
    packageName: string;
    addedNamespaces: string[];
    removedNamespaces: string[];
}
export declare function registerSyncNamespaceTemplatesTask(taskManagerSetup: TaskManagerSetupContract): void;
export declare function scheduleSyncNamespaceTemplatesTask(taskManagerStart: TaskManagerStartContract, params: SyncNamespaceTemplatesTaskParams): Promise<void>;
