import type { JsonObject } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
import type { SerializedHistogram } from './lib';
import type { ITaskMetricsAggregator } from './types';
declare enum TaskRunKeys {
    SUCCESS = "success",
    NOT_TIMED_OUT = "not_timed_out",
    TOTAL = "total",
    TOTAL_ERRORS = "total_errors",
    RESCHEDULED_FAILURES = "rescheduled_failures",
    USER_ERRORS = "user_errors",
    FRAMEWORK_ERRORS = "framework_errors"
}
declare enum TaskRunMetricKeys {
    OVERALL = "overall",
    BY_TYPE = "by_type"
}
interface TaskRunCounts extends JsonObject {
    [TaskRunKeys.SUCCESS]: number;
    [TaskRunKeys.NOT_TIMED_OUT]: number;
    [TaskRunKeys.TOTAL]: number;
    [TaskRunKeys.USER_ERRORS]: number;
    [TaskRunKeys.FRAMEWORK_ERRORS]: number;
    [TaskRunKeys.RESCHEDULED_FAILURES]: number;
}
export interface TaskRunMetrics extends JsonObject {
    [TaskRunMetricKeys.OVERALL]: TaskRunCounts;
    [TaskRunMetricKeys.BY_TYPE]: {
        [key: string]: TaskRunCounts;
    };
}
export interface TaskRunMetric extends JsonObject {
    overall: TaskRunMetrics['overall'] & {
        delay: SerializedHistogram;
        delay_values: number[];
    };
    by_type: TaskRunMetrics['by_type'];
}
export declare class TaskRunMetricsAggregator implements ITaskMetricsAggregator<TaskRunMetric> {
    private logger;
    private counter;
    private delayHistogram;
    constructor(logger: Logger);
    initialMetric(): TaskRunMetric;
    collect(): TaskRunMetric;
    reset(): void;
    processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent): void;
    private processTaskRunEvent;
    private processTaskManagerStatEvent;
    private incrementCounters;
}
export {};
