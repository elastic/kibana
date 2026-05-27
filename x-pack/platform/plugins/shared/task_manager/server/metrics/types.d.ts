import type { TaskLifecycleEvent } from '../polling_lifecycle';
export interface ITaskMetricsAggregator<T> {
    initialMetric: () => T;
    collect: () => T;
    reset: () => void;
    processTaskLifecycleEvent: (event: TaskLifecycleEvent) => void;
}
