import type { MetricResult } from '@kbn/monitoring-collection-plugin/server';
export declare const EMPTY_CLUSTER_ACTIONS_METRICS: ClusterActionsMetric;
export type ClusterActionsMetric = MetricResult<{
    overdue: {
        count: number;
        delay: {
            p50: number;
            p99: number;
        };
    };
}>;
export type NodeActionsMetric = MetricResult<{
    failures: number | null;
    executions: number | null;
    timeouts: number | null;
}>;
