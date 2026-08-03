import type { FC } from 'react';
export interface MetricDistributionChartData {
    x: number;
    y: number;
    dataMin: number;
    dataMax: number;
    percent: number;
}
interface Props {
    width: number;
    height: number;
    chartData: MetricDistributionChartData[];
    fieldFormat?: any;
    hideXAxis?: boolean;
}
export declare const MetricDistributionChart: FC<Props>;
export {};
