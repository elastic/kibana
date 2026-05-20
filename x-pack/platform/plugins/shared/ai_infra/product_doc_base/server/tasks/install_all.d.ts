import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { InternalServices } from '../types';
export declare const INSTALL_ALL_TASK_TYPE = "ProductDocBase:InstallAll";
export declare const INSTALL_ALL_TASK_ID = "ProductDocBase:InstallAll";
export declare const INSTALL_ALL_TASK_ID_MULTILINGUAL = "ProductDocBase:InstallAllMultilingual";
export declare const registerInstallAllTaskDefinition: ({ getServices, taskManager, }: {
    getServices: () => InternalServices;
    taskManager: TaskManagerSetupContract;
}) => void;
export declare const scheduleInstallAllTask: ({ taskManager, logger, inferenceId, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    inferenceId: string;
}) => Promise<"ProductDocBase:InstallAll" | "ProductDocBase:InstallAllMultilingual">;
