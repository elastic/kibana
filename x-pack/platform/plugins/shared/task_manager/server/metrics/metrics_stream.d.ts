import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { TaskManagerConfig } from '../config';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskClaimMetric } from './task_claim_metrics_aggregator';
import type { TaskRunMetric } from './task_run_metrics_aggregator';
import type { TaskOverdueMetric } from './task_overdue_metrics_aggregator';
import type { TaskManagerMetricsCollector } from './task_metrics_collector';
export interface Metrics {
    last_update: string;
    metrics: {
        task_claim?: Metric<TaskClaimMetric>;
        task_run?: Metric<TaskRunMetric>;
        task_overdue?: Metric<TaskOverdueMetric>;
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
}
export declare function createMetricsAggregators({ config, reset$, logger, taskPollingLifecycle, taskManagerMetricsCollector, }: CreateMetricsAggregatorsOpts): AggregatedStatProvider;
export declare function createMetricsStream(provider$: AggregatedStatProvider): Observable<Metrics>;
export {};
