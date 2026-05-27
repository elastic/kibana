import type { Observable } from 'rxjs';
import type { JsonValue } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskManagerConfig } from '../config';
import type { ITaskMetricsAggregator } from './types';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
export interface CreateMetricsAggregatorOpts<T> {
    key: string;
    config: TaskManagerConfig;
    logger?: Logger;
    reset$?: Observable<boolean>;
    events$: Observable<TaskLifecycleEvent>;
    eventFilter: (event: TaskLifecycleEvent) => boolean;
    metricsAggregator: ITaskMetricsAggregator<T>;
}
export declare function createAggregator<T extends JsonValue>({ key, config, reset$, logger, events$, eventFilter, metricsAggregator, }: CreateMetricsAggregatorOpts<T>): AggregatedStatProvider<T>;
