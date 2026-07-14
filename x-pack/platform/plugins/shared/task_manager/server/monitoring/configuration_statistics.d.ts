import type { JsonObject } from '@kbn/utility-types';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskManagerConfig } from '../config';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
declare const CONFIG_FIELDS_TO_EXPOSE: readonly ["request_capacity", "monitored_aggregated_stats_refresh_rate", "monitored_stats_running_average_window", "monitored_task_execution_thresholds"];
interface CapacityConfig extends JsonObject {
    capacity: {
        config: number;
        as_workers: number;
        as_cost: number;
    };
}
export type ConfigStat = Pick<TaskManagerConfig, 'poll_interval' | 'claim_strategy' | (typeof CONFIG_FIELDS_TO_EXPOSE)[number]> & CapacityConfig;
export declare function createConfigurationAggregator(config: TaskManagerConfig, startingCapacity: number, taskPollingLifecycle?: TaskPollingLifecycle): AggregatedStatProvider<ConfigStat>;
export {};
