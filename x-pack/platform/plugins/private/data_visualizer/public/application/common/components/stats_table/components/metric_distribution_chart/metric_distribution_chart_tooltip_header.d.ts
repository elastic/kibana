import type { FC } from 'react';
import type { MetricDistributionChartData } from './metric_distribution_chart';
interface Props {
    chartPoint: MetricDistributionChartData | undefined;
    maxWidth: number;
    fieldFormat?: any;
}
export declare const MetricDistributionChartTooltipHeader: FC<Props>;
export {};
