import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { InternalServices } from '../types';
export declare const registerTaskDefinitions: ({ getServices, taskManager, }: {
    getServices: () => InternalServices;
    taskManager: TaskManagerSetupContract;
}) => void;
export { scheduleEnsureUpToDateTask, ENSURE_DOC_UP_TO_DATE_TASK_ID } from './ensure_up_to_date';
export { scheduleEnsureSecurityLabsUpToDateTask, ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID, } from './ensure_security_labs_up_to_date';
export { scheduleInstallAllTask, INSTALL_ALL_TASK_ID, INSTALL_ALL_TASK_ID_MULTILINGUAL, } from './install_all';
export { scheduleUninstallAllTask, UNINSTALL_ALL_TASK_ID, UNINSTALL_ALL_TASK_ID_MULTILINGUAL, } from './uninstall_all';
export { waitUntilTaskCompleted, getTaskStatus } from './utils';
