import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { TaskManagerConfig } from '../config';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskClaimMetric } from './task_claim_metrics_aggregator';
import type { TaskRunMetric } from './task_run_metrics_aggregator';
import type { TaskOverdueMetric } from './task_overdue_metrics_aggregator';
import type { TaskBackpressureMetric } from './task_backpressure_metrics_aggregator';
import type { TaskManagerMetricsCollector } from './task_metrics_collector';
import type { TaskTypeDictionary } from '../task_type_dictionary';
export interface Metrics {
    last_update: string;
    metrics: {
        task_claim?: Metric<TaskClaimMetric>;
        task_run?: Metric<TaskRunMetric>;
        task_overdue?: Metric<TaskOverdueMetric>;
        task_backpressure?: Metric<TaskBackpressureMetric>;
    };
}
export interface Metric<T> {
    timestamp: string;
    value: T;
}
interface CreateMetricsAggregatorsOpts {
    config: TaskManagerConfig;
    logger: Logger;
    reset$: Observable<boolean>;
    taskPollingLifecycle?: TaskPollingLifecycle;
    taskManagerMetricsCollector?: TaskManagerMetricsCollector;
    definitions: TaskTypeDictionary;
}
export declare function createMetricsAggregators({ config, reset$, logger, taskPollingLifecycle, taskManagerMetricsCollector, definitions, }: CreateMetricsAggregatorsOpts): AggregatedStatProvider;
export declare function createMetricsStream(provider$: AggregatedStatProvider): Observable<Metrics>;
export {};
