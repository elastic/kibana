import type { TypeOf } from '@kbn/config-schema';
export declare const MAX_WORKERS_LIMIT = 100;
export declare const DEFAULT_CAPACITY = 10;
export declare const MAX_CAPACITY = 50;
export declare const MIN_CAPACITY = 5;
export declare const DEFAULT_MAX_WORKERS = 10;
export declare const DEFAULT_POLL_INTERVAL = 3000;
export declare const MGET_DEFAULT_POLL_INTERVAL = 500;
export declare const DEFAULT_VERSION_CONFLICT_THRESHOLD = 80;
export declare const DEFAULT_MONITORING_REFRESH_RATE: number;
export declare const DEFAULT_MONITORING_STATS_RUNNING_AVERAGE_WINDOW = 50;
export declare const DEFAULT_MONITORING_STATS_WARN_DELAYED_TASK_START_IN_SECONDS = 60;
export declare const DEFAULT_METRICS_RESET_INTERVAL: number;
export declare const DEFAULT_WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW = 5;
export declare const WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW_SIZE_MS: number;
export declare const CLAIM_STRATEGY_UPDATE_BY_QUERY = "update_by_query";
export declare const CLAIM_STRATEGY_MGET = "mget";
export declare const DEFAULT_DISCOVERY_INTERVAL_MS: number;
export declare const DISCOVERY_INTERVAL_AFTER_BLOCK_EXCEPTION_MS: number;
export declare const DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION = "30s";
export declare const DEFAULT_KIBANAS_PER_PARTITION = 2;
export declare enum ApiKeyType {
    ES = "es",
    UIAM = "uiam"
}
export declare const taskExecutionFailureThresholdSchema: import("@kbn/config-schema").ObjectType<{
    error_threshold: import("@kbn/config-schema").Type<number>;
    warn_threshold: import("@kbn/config-schema").Type<number>;
}>;
declare const eventLoopDelaySchema: import("@kbn/config-schema").ObjectType<{
    monitor: import("@kbn/config-schema").Type<boolean>;
    warn_threshold: import("@kbn/config-schema").Type<number>;
}>;
declare const requestTimeoutsConfig: import("@kbn/config-schema").ObjectType<{
    update_by_query: import("@kbn/config-schema").Type<number>;
}>;
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    allow_reading_invalid_state: import("@kbn/config-schema").Type<boolean>;
    api_key_type: import("@kbn/config-schema").Type<ApiKeyType>;
    grant_uiam_api_keys: import("@kbn/config-schema").Type<boolean>;
    capacity: import("@kbn/config-schema").Type<number | undefined>;
    discovery: import("@kbn/config-schema").ObjectType<{
        active_nodes_lookback: import("@kbn/config-schema").Type<string>;
        interval: import("@kbn/config-schema").Type<number>;
    }>;
    ephemeral_tasks: import("@kbn/config-schema").Type<any>;
    event_loop_delay: import("@kbn/config-schema").ObjectType<{
        monitor: import("@kbn/config-schema").Type<boolean>;
        warn_threshold: import("@kbn/config-schema").Type<number>;
    }>;
    invalidate_api_key_task: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
        removalDelay: import("@kbn/config-schema").Type<string>;
    }>;
    kibanas_per_partition: import("@kbn/config-schema").Type<number>;
    max_attempts: import("@kbn/config-schema").Type<number>;
    max_workers: import("@kbn/config-schema").Type<number | undefined>;
    metrics_reset_interval: import("@kbn/config-schema").Type<number>;
    monitored_aggregated_stats_refresh_rate: import("@kbn/config-schema").Type<number>;
    monitored_stats_health_verbose_log: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        level: import("@kbn/config-schema").Type<"debug" | "info">;
        warn_delayed_task_start_in_seconds: import("@kbn/config-schema").Type<number>;
    }>;
    monitored_stats_required_freshness: import("@kbn/config-schema").Type<number>;
    monitored_stats_running_average_window: import("@kbn/config-schema").Type<number>;
    monitored_task_execution_thresholds: import("@kbn/config-schema").ObjectType<{
        custom: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
            error_threshold: number;
            warn_threshold: number;
        }>>>;
        default: import("@kbn/config-schema").ObjectType<{
            error_threshold: import("@kbn/config-schema").Type<number>;
            warn_threshold: import("@kbn/config-schema").Type<number>;
        }>;
    }>;
    poll_interval: import("@kbn/config-schema").ConditionalType<"mget", number, number>;
    request_capacity: import("@kbn/config-schema").Type<number>;
    unsafe: import("@kbn/config-schema").ObjectType<{
        authenticate_background_task_utilization: import("@kbn/config-schema").Type<boolean>;
        exclude_task_types: import("@kbn/config-schema").Type<string[]>;
    }>;
    version_conflict_threshold: import("@kbn/config-schema").Type<number>;
    worker_utilization_running_average_window: import("@kbn/config-schema").Type<number | undefined>;
    claim_strategy: import("@kbn/config-schema").Type<string>;
    request_timeouts: import("@kbn/config-schema").ObjectType<{
        update_by_query: import("@kbn/config-schema").Type<number>;
    }>;
    auto_calculate_default_ech_capacity: import("@kbn/config-schema").Type<boolean>;
}>;
export type TaskManagerConfig = TypeOf<typeof configSchema>;
export type TaskExecutionFailureThreshold = TypeOf<typeof taskExecutionFailureThresholdSchema>;
export type EventLoopDelayConfig = TypeOf<typeof eventLoopDelaySchema>;
export type RequestTimeoutsConfig = TypeOf<typeof requestTimeoutsConfig>;
export {};
