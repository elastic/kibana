import type { JsonObject, JsonValue } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { TaskPersistence } from '../task_events';
import { TaskRunResult } from '../task_running';
import { FillPoolResult } from '../lib/fill_pool';
import type { AveragedStat } from './task_run_calculators';
import { HealthStatus } from './monitoring_stats_stream';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { TaskManagerConfig } from '../config';
interface FillPoolStat extends JsonObject {
    duration: number[];
    claim_duration: number[];
    claim_conflicts: number[];
    claim_mismatches: number[];
    claim_stale_tasks: number[];
    result_frequency_percent_as_number: FillPoolResult[];
    persistence: TaskPersistence[];
}
interface OptionalFillPoolStat extends JsonObject {
    last_successful_poll: string;
    last_polling_delay: string;
}
interface ExecutionStat extends JsonObject {
    duration: Record<string, number[]>;
    duration_by_persistence: Record<string, number[]>;
    result_frequency_percent_as_number: Record<string, TaskRunResult[]>;
    persistence: TaskPersistence[];
}
export interface TaskRunStat extends JsonObject {
    drift: number[];
    drift_by_type: Record<string, number[]>;
    load: number[];
    execution: ExecutionStat;
    polling: FillPoolStat & Partial<OptionalFillPoolStat>;
}
interface FillPoolRawStat extends JsonObject {
    last_successful_poll: string;
    last_polling_delay: string;
    result_frequency_percent_as_number: {
        [FillPoolResult.Failed]: number;
        [FillPoolResult.NoAvailableWorkers]: number;
        [FillPoolResult.NoTasksClaimed]: number;
        [FillPoolResult.RanOutOfCapacity]: number;
        [FillPoolResult.RunningAtCapacity]: number;
        [FillPoolResult.PoolFilled]: number;
    };
    persistence: TaskPersistenceTypes;
}
interface ResultFrequency extends JsonObject {
    [TaskRunResult.Success]: number;
    [TaskRunResult.SuccessRescheduled]: number;
    [TaskRunResult.RetryScheduled]: number;
    [TaskRunResult.Failed]: number;
}
export interface TaskPersistenceTypes<T extends JsonValue = number> extends JsonObject {
    [TaskPersistence.Recurring]: T;
    [TaskPersistence.NonRecurring]: T;
}
type ResultFrequencySummary = ResultFrequency & {
    status: HealthStatus;
};
export interface SummarizedTaskRunStat extends JsonObject {
    drift: AveragedStat;
    drift_by_type: {
        [alertType: string]: AveragedStat;
    };
    load: AveragedStat;
    execution: {
        duration: Record<string, AveragedStat>;
        duration_by_persistence: Record<string, AveragedStat>;
        result_frequency_percent_as_number: Record<string, ResultFrequencySummary>;
        persistence: TaskPersistenceTypes;
    };
    polling: FillPoolRawStat | Omit<FillPoolRawStat, 'last_successful_poll'>;
}
export declare function createTaskRunAggregator(taskPollingLifecycle: TaskPollingLifecycle, runningAverageWindowSize: number): AggregatedStatProvider<TaskRunStat>;
export declare function summarizeTaskRunStat(logger: Logger, { polling: { last_successful_poll, last_polling_delay, duration: pollingDuration, claim_duration, result_frequency_percent_as_number: pollingResultFrequency, claim_conflicts: claimConflicts, claim_mismatches: claimMismatches, claim_stale_tasks: claimStaleTasks, persistence: pollingPersistence, }, drift, drift_by_type, load, execution: { duration, duration_by_persistence: durationByPersistence, persistence, result_frequency_percent_as_number: executionResultFrequency, }, }: TaskRunStat, config: TaskManagerConfig): {
    value: SummarizedTaskRunStat;
    status: HealthStatus;
};
export {};
