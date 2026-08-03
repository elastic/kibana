import type { Logger } from '@kbn/logging';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { InternalServices } from '../types';
export declare const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE = "ProductDocBase:EnsureSecurityLabsUpToDate";
export declare const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID = "ProductDocBase:EnsureSecurityLabsUpToDate";
export declare const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID_MULTILINGUAL = "ProductDocBase:EnsureSecurityLabsUpToDateMultilingual";
export declare const registerEnsureSecurityLabsUpToDateTaskDefinition: ({ getServices, taskManager, }: {
    getServices: () => InternalServices;
    taskManager: TaskManagerSetupContract;
}) => void;
export declare const scheduleEnsureSecurityLabsUpToDateTask: ({ taskManager, logger, inferenceId, forceUpdate, }: {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    inferenceId: string;
    forceUpdate?: boolean;
}) => Promise<"ProductDocBase:EnsureSecurityLabsUpToDate" | "ProductDocBase:EnsureSecurityLabsUpToDateMultilingual">;
