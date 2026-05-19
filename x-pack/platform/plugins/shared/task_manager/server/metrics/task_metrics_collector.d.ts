import type { Logger } from '@kbn/core/server';
import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { Observable } from 'rxjs';
import type { TaskStore } from '../task_store';
import type { ITaskEventEmitter, TaskLifecycleEvent } from '../polling_lifecycle';
interface ConstructorOpts {
    logger: Logger;
    store: TaskStore;
    pollInterval?: number;
    taskTypes: Set<string>;
    excludedTypes: Set<string>;
}
export interface TaskManagerMetrics {
    numOverdueTasks: {
        total: AggregationsStringTermsBucketKeys[];
        [key: string]: AggregationsStringTermsBucketKeys[];
    };
}
export declare class TaskManagerMetricsCollector implements ITaskEventEmitter<TaskLifecycleEvent> {
    private store;
    private logger;
    private readonly pollInterval;
    private readonly taskTypes;
    private readonly excludedTypes;
    private running;
    private metrics$;
    constructor({ logger, store, pollInterval, taskTypes, excludedTypes }: ConstructorOpts);
    get events(): Observable<TaskLifecycleEvent>;
    private start;
    private runCollectionCycle;
}
export {};
