import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { JsonObject } from '@kbn/utility-types';
import type { SummarizedWorkloadStat, WorkloadStat } from './workload_statistics';
import type { TaskRunStat, SummarizedTaskRunStat } from './task_run_statistics';
import type { BackgroundTaskUtilizationStat } from './background_task_utilization_statistics';
import type { ConfigStat } from './configuration_statistics';
import type { TaskManagerConfig } from '../config';
import type { CapacityEstimationStat } from './capacity_estimation';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { CreateMonitoringStatsOpts } from '.';
export interface MonitoringStats {
    last_update: string;
    stats: {
        configuration?: MonitoredStat<ConfigStat>;
        workload?: MonitoredStat<WorkloadStat>;
        runtime?: MonitoredStat<TaskRunStat>;
        utilization?: MonitoredStat<BackgroundTaskUtilizationStat>;
    };
}
export declare enum HealthStatus {
    Uninitialized = "uninitialized",
    OK = "OK",
    Warning = "warn",
    Error = "error"
}
export interface MonitoredStat<T> {
    timestamp: string;
    value: T;
}
export type RawMonitoredStat<T extends JsonObject> = MonitoredStat<T> & {
    status: HealthStatus;
    reason?: string;
};
export interface RawMonitoringStats {
    last_update: string;
    stats: {
        configuration?: RawMonitoredStat<ConfigStat>;
        workload?: RawMonitoredStat<SummarizedWorkloadStat>;
        runtime?: RawMonitoredStat<SummarizedTaskRunStat>;
        capacity_estimation?: RawMonitoredStat<CapacityEstimationStat>;
    };
}
export declare function createAggregators({ taskStore, elasticsearchAndSOAvailability$, config, logger, taskDefinitions, adHocTaskCounter, startingCapacity, taskPollingLifecycle, }: CreateMonitoringStatsOpts): AggregatedStatProvider;
export declare function createMonitoringStatsStream(provider$: AggregatedStatProvider): Observable<MonitoringStats>;
export declare function summarizeMonitoringStats(logger: Logger, { last_update, stats: { runtime, workload, configuration, utilization } }: MonitoringStats, config: TaskManagerConfig, assumedKibanaInstances: number): RawMonitoringStats;
