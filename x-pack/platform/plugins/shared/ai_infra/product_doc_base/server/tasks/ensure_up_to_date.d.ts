import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { InternalServices } from '../types';
export declare const ENSURE_DOC_UP_TO_DATE_TASK_TYPE = "ProductDocBase:EnsureUpToDate";
export declare const ENSURE_DOC_UP_TO_DATE_TASK_ID = "ProductDocBase:EnsureUpToDate";
export declare const ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL = "ProductDocBase:EnsureUpToDateMultilingual";
export declare const registerEnsureUpToDateTaskDefinition: ({ getServices, taskManager, }: {
    getServices: () => InternalServices;
    taskManager: TaskManagerSetupContract;
}) => void;
export declare const scheduleEnsureUpToDateTask: ({ taskManager, logger, inferenceId, forceUpdate, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    inferenceId: string;
    forceUpdate?: boolean;
}) => Promise<"ProductDocBase:EnsureUpToDate" | "ProductDocBase:EnsureUpToDateMultilingual">;
