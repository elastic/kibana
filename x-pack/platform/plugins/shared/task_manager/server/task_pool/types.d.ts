import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskRunner } from '../task_running';
import type { TaskDefinition } from '../task';
export interface ICapacity {
    get capacity(): number;
    availableCapacity(tasksInPool: Map<string, TaskRunner>, taskDefinition?: TaskDefinition | null): number;
    usedCapacity(tasksInPool: Map<string, TaskRunner>): number;
    usedCapacityPercentage(tasksInPool: Map<string, TaskRunner>): number;
    getUsedCapacityByType(tasksInPool: TaskRunner[], type: string): number;
    determineTasksToRunBasedOnCapacity(tasks: TaskRunner[], availableCapacity: number): [TaskRunner[], TaskRunner[]];
}
export interface CapacityOpts {
    capacity$: Observable<number>;
    logger: Logger;
}
