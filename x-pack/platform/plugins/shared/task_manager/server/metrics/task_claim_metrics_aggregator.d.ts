import type { JsonObject } from '@kbn/utility-types';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
import { type SerializedHistogram } from './lib';
import type { ITaskMetricsAggregator } from './types';
declare enum TaskClaimKeys {
    SUCCESS = "success",
    TOTAL = "total",
    TOTAL_ERRORS = "total_errors"
}
interface TaskClaimCounts extends JsonObject {
    [TaskClaimKeys.SUCCESS]: number;
    [TaskClaimKeys.TOTAL]: number;
}
export type TaskClaimMetric = TaskClaimCounts & {
    duration: SerializedHistogram;
    duration_values: number[];
};
export declare class TaskClaimMetricsAggregator implements ITaskMetricsAggregator<TaskClaimMetric> {
    private counter;
    private durationHistogram;
    initialMetric(): TaskClaimMetric;
    collect(): TaskClaimMetric;
    reset(): void;
    processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent): void;
}
export {};
