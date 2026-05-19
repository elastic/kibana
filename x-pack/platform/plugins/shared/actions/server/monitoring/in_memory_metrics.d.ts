import type { Logger } from '@kbn/logging';
export declare enum IN_MEMORY_METRICS {
    ACTION_EXECUTIONS = "actionExecutions",
    ACTION_FAILURES = "actionFailures",
    ACTION_TIMEOUTS = "actionTimeouts"
}
export declare class InMemoryMetrics {
    private logger;
    private inMemoryMetrics;
    constructor(logger: Logger);
    increment(metric: IN_MEMORY_METRICS): void;
    getInMemoryMetric(metric: IN_MEMORY_METRICS): number | null;
    getAllInMemoryMetrics(): Record<IN_MEMORY_METRICS, number | null>;
}
