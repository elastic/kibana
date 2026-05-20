import type { FC } from 'react';
import type { BrushEndListener } from '@elastic/charts';
import type { LineChartPoint } from '../../../../common/chart_loader';
import type { Anomaly } from '../../../../common/results_loader';
interface Props {
    eventRateChartData: LineChartPoint[];
    anomalyData?: Anomaly[];
    height: string;
    width: string;
    showAxis?: boolean;
    loading?: boolean;
    fadeChart?: boolean;
    overlayRanges?: Array<{
        start: number;
        end: number;
        color: string;
        showMarker?: boolean;
    }>;
    onBrushEnd?: BrushEndListener;
}
export declare const EventRateChart: FC<Props>;
export {};
