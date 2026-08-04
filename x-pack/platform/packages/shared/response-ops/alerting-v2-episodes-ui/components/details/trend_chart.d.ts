import React from 'react';
import type { TrendSeries, TrendThreshold } from './trend_types';
export interface AlertEpisodeTrendChartProps {
    series: TrendSeries;
    thresholds: TrendThreshold[];
}
export declare const AlertEpisodeTrendChart: ({ series, thresholds }: AlertEpisodeTrendChartProps) => React.JSX.Element;
