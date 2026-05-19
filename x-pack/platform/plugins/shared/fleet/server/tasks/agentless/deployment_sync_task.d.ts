import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { type FleetConfigType } from '../../config';
export declare function registerAgentlessDeploymentSyncTask(taskManager: TaskManagerSetupContract, config: FleetConfigType): void;
export declare function scheduleAgentlessDeploymentSyncTask(taskManager: TaskManagerStartContract, config: FleetConfigType): Promise<void>;
