import type { TaskDefinition } from '../task';
import type { TaskRunner } from '../task_running';
import type { CapacityOpts, ICapacity } from './types';
export declare class CostCapacity implements ICapacity {
    private maxAllowedCost;
    private logger;
    constructor(opts: CapacityOpts);
    get capacity(): number;
    /**
     * Gets how much capacity is currently in use.
     */
    usedCapacity(tasksInPool: Map<string, TaskRunner>): number;
    /**
     * Gets % of capacity in use
     */
    usedCapacityPercentage(tasksInPool: Map<string, TaskRunner>): number;
    /**
     * Gets how much capacity is currently in use by each type.
     */
    getUsedCapacityByType(tasksInPool: TaskRunner[], type: string): number;
    availableCapacity(tasksInPool: Map<string, TaskRunner>, taskDefinition?: TaskDefinition | null): number;
    determineTasksToRunBasedOnCapacity(tasks: TaskRunner[], availableCapacity: number): [TaskRunner[], TaskRunner[]];
}
