import type { TaskManagerStartContract, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { fetchAgentsUsage } from '../collectors/register';
export declare function registerFleetUsageLogger(taskManager: TaskManagerSetupContract, fetchUsage: () => ReturnType<typeof fetchAgentsUsage>): void;
export declare function startFleetUsageLogger(taskManager: TaskManagerStartContract): Promise<void>;
