import type { FC } from 'react';
export interface MetricFieldsStats {
    visibleMetricsCount: number;
    totalMetricFieldsCount: number;
}
export interface MetricFieldsCountProps {
    metricsStats?: MetricFieldsStats;
}
export declare const MetricFieldsCount: FC<MetricFieldsCountProps>;
