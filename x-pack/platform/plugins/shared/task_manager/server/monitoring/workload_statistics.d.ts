import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { JsonObject } from '@kbn/utility-types';
import type { estypes } from '@elastic/elasticsearch';
import type { AggregationResultOf } from '@kbn/es-types';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { HealthStatus } from './monitoring_stats_stream';
import type { TaskStore } from '../task_store';
import type { TaskTypeDictionary } from '../task_type_dictionary';
interface StatusStat extends JsonObject {
    [status: string]: number;
}
interface TaskTypeStat extends JsonObject {
    [taskType: string]: {
        count: number;
        cost: number;
        status: StatusStat;
    };
}
interface RawWorkloadStat extends JsonObject {
    count: number;
    cost: number;
    task_types: TaskTypeStat;
    schedule: Array<[string, number]>;
    non_recurring: number;
    non_recurring_cost: number;
    overdue: number;
    overdue_cost: number;
    overdue_non_recurring: number;
    estimated_schedule_density: number[];
    capacity_requirements: CapacityRequirements;
}
export type WorkloadStat = RawWorkloadStat;
export type SummarizedWorkloadStat = RawWorkloadStat;
export interface CapacityRequirements extends JsonObject {
    per_minute: number;
    per_hour: number;
    per_day: number;
}
export interface WorkloadAggregation {
    aggs: {
        taskType: {
            terms: {
                field: string;
            };
            aggs: {
                status: {
                    terms: {
                        field: string;
                    };
                };
            };
        };
        schedule: {
            terms: {
                field: string;
                size: number;
            };
        };
        idleTasks: {
            filter: {
                term: {
                    'task.status': string;
                };
            };
            aggs: {
                scheduleDensity: {
                    range: {
                        field: string;
                        ranges: [{
                            from: string;
                            to: string;
                        }];
                    };
                    aggs: {
                        histogram: {
                            date_histogram: {
                                field: string;
                                fixed_interval: string;
                            };
                            aggs: {
                                interval: {
                                    terms: {
                                        field: string;
                                    };
                                };
                            };
                        };
                    };
                };
                overdue: {
                    filter: {
                        range: {
                            'task.runAt': {
                                lt: string;
                            };
                        };
                    };
                };
            };
        };
    };
}
type ScheduleDensityResult = AggregationResultOf<WorkloadAggregation['aggs']['idleTasks']['aggs']['scheduleDensity'], {}>['buckets'][0];
export interface CreateWorkloadAggregatorOpts {
    taskStore: TaskStore;
    elasticsearchAndSOAvailability$: Observable<boolean>;
    refreshInterval: number;
    pollInterval: number;
    logger: Logger;
    taskDefinitions: TaskTypeDictionary;
}
export declare function createWorkloadAggregator({ taskStore, elasticsearchAndSOAvailability$, refreshInterval, pollInterval, logger, taskDefinitions, }: CreateWorkloadAggregatorOpts): AggregatedStatProvider<WorkloadStat>;
interface IntervalTaskCountTouple {
    nonRecurring?: number;
    recurring?: Array<[number, string]>;
    key: number;
}
export declare function padBuckets(scheduleDensityBuckets: number, pollInterval: number, scheduleDensity: ScheduleDensityResult): number[];
export declare function estimateRecurringTaskScheduling(scheduleDensity: IntervalTaskCountTouple[], pollInterval: number): number[];
export declare function summarizeWorkloadStat(workloadStats: WorkloadStat): {
    value: SummarizedWorkloadStat;
    status: HealthStatus;
};
export interface WorkloadAggregationResponse {
    taskType: TaskTypeAggregation;
    schedule: ScheduleAggregation;
    idleTasks: IdleTasksAggregation;
    nonRecurringTasks: {
        doc_count: number;
        taskType: TaskTypeAggregation;
    };
    [otherAggs: string]: estypes.AggregationsAggregate;
}
export type TaskTypeWithStatusBucket = TaskTypeBucket & {
    status: {
        buckets: Array<{
            doc_count: number;
            key: string | number;
        }>;
        doc_count_error_upper_bound?: number | undefined;
        sum_other_doc_count?: number | undefined;
    };
};
export interface TaskTypeBucket {
    doc_count: number;
    key: string | number;
}
export interface TaskTypeAggregation extends estypes.AggregationsFiltersAggregate {
    buckets: Array<TaskTypeBucket | TaskTypeWithStatusBucket>;
    doc_count_error_upper_bound?: number | undefined;
    sum_other_doc_count?: number | undefined;
}
export interface ScheduleAggregation extends estypes.AggregationsFiltersAggregate {
    buckets: Array<{
        doc_count: number;
        key: string;
    }>;
    doc_count_error_upper_bound?: number | undefined;
    sum_other_doc_count?: number | undefined;
}
export type ScheduleDensityHistogram = DateRangeBucket & {
    histogram: {
        buckets: Array<DateHistogramBucket & {
            interval: {
                buckets: Array<{
                    doc_count: number;
                    key: string | number;
                }>;
                doc_count_error_upper_bound?: number | undefined;
                sum_other_doc_count?: number | undefined;
            };
        }>;
    };
};
export interface IdleTasksAggregation extends estypes.AggregationsFiltersAggregate {
    doc_count: number;
    scheduleDensity: {
        buckets: ScheduleDensityHistogram[];
    };
    overdue: {
        doc_count: number;
        nonRecurring: {
            doc_count: number;
        };
        taskTypes: TaskTypeAggregation;
    };
}
interface DateHistogramBucket {
    doc_count: number;
    key: number;
    key_as_string: string;
}
interface DateRangeBucket {
    key: string;
    to?: number;
    from?: number;
    to_as_string?: string;
    from_as_string?: string;
    doc_count: number;
}
export {};
