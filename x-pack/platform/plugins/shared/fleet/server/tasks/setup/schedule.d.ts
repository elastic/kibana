import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { type SetupTaskParams } from './utils';
/**
 * Schedule Fleet setup tasks.
 *
 * @param taskManagerStart - Task manager start contract
 * @param taskParams - Optional specific task to schedule. If not provided, schedules default setup tasks.
 */
export declare function scheduleSetupTask(taskManagerStart: TaskManagerStartContract, taskParams?: SetupTaskParams): Promise<void>;
