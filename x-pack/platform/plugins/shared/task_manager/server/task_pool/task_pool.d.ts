import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskRunner } from '../task_running';
import type { TaskManagerStat } from '../task_events';
import type { TaskTypeDictionary } from '../task_type_dictionary';
interface TaskPoolOpts {
    capacity$: Observable<number>;
    definitions: TaskTypeDictionary;
    logger: Logger;
    strategy: string;
}
export declare enum TaskPoolRunResult {
    NoTaskWereRan = "NoTaskWereRan",
    RunningAllClaimedTasks = "RunningAllClaimedTasks",
    RunningAtCapacity = "RunningAtCapacity",
    RanOutOfCapacity = "RanOutOfCapacity"
}
/**
 * Runs tasks in batches, taking costs into account.
 */
export declare class TaskPool {
    private tasksInPool;
    private logger;
    private load$;
    private definitions;
    private capacityCalculator;
    /**
     * Creates an instance of TaskPool.
     *
     * @param {Opts} opts
     * @prop {number} capacity - The total capacity available
     *    (e.g. capacity is 4, then 2 tasks of cost 2 can run at a time, or 4 tasks of cost 1)
     * @prop {Logger} logger - The task manager logger.
     */
    constructor(opts: TaskPoolOpts);
    get load(): Observable<TaskManagerStat>;
    /**
     * Gets the IDs of current tasks in pool
     */
    getCurrentTasksInPool(): string[];
    /**
     * Gets how much capacity is currently in use.
     */
    get usedCapacity(): number;
    /**
     * Gets how much capacity is currently in use as a percentage
     */
    get usedCapacityPercentage(): number;
    /**
     * Gets how much capacity is currently available.
     */
    availableCapacity(taskType?: string): number;
    /**
     * Gets how much capacity is currently in use by each type.
     */
    getUsedCapacityByType(type: string): number;
    /**
     * Attempts to run the specified list of tasks. Returns true if it was able
     * to start every task in the list, false if there was not enough capacity
     * to run every task.
     *
     * @param {TaskRunner[]} tasks
     * @returns {Promise<boolean>}
     */
    run(tasks: TaskRunner[]): Promise<TaskPoolRunResult>;
    cancelRunningTasks(): void;
    private handleMarkAsRunning;
    private handleFailureOfMarkAsRunning;
    private cancelExpiredTasks;
    private cancelTask;
}
export {};
