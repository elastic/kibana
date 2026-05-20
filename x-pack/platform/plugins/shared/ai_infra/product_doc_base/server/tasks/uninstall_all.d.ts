import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ResourceType } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
export declare const UNINSTALL_ALL_TASK_TYPE = "ProductDocBase:UninstallAll";
export declare const UNINSTALL_ALL_TASK_ID = "ProductDocBase:UninstallAll";
export declare const UNINSTALL_ALL_TASK_ID_MULTILINGUAL = "ProductDocBase:UninstallAllMultilingual";
export declare const registerUninstallAllTaskDefinition: ({ getServices, taskManager, }: {
    getServices: () => InternalServices;
    taskManager: TaskManagerSetupContract;
}) => void;
export declare const scheduleUninstallAllTask: ({ taskManager, logger, inferenceId, resourceType, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    inferenceId: string;
    resourceType?: ResourceType;
}) => Promise<"ProductDocBase:UninstallAll" | "ProductDocBase:UninstallAllMultilingual">;
