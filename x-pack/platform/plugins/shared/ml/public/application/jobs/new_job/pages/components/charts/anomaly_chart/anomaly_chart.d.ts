import type { FC } from 'react';
import type { ModelItem, Anomaly } from '../../../../common/results_loader';
import type { LineChartPoint } from '../../../../common/chart_loader';
export declare enum CHART_TYPE {
    LINE = 0,
    SCATTER = 1
}
interface Props {
    chartType: CHART_TYPE;
    chartData: LineChartPoint[];
    modelData: ModelItem[];
    anomalyData: Anomaly[];
    height: string;
    width: string;
    loading?: boolean;
}
export declare const AnomalyChart: FC<Props>;
export {};
