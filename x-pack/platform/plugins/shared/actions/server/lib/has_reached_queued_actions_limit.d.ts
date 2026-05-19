import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
export declare function hasReachedTheQueuedActionsLimit(taskManager: TaskManagerStartContract, configurationUtilities: ActionsConfigurationUtilities, numberOfActions: number): Promise<{
    hasReachedLimit: boolean;
    numberOverLimit: number;
}>;
