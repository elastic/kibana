import type { FC } from 'react';
import React from 'react';
import type { LogRateHistogramItem } from '@kbn/aiops-log-rate-analysis';
interface Props {
    width?: number;
    chartPoints: LogRateHistogramItem[];
    timeRangeEarliest: number;
    timeRangeLatest: number;
    interval?: number;
    loading: boolean;
}
export declare function LoadingSpinner(): React.JSX.Element;
export declare const DocumentCountChart: FC<Props>;
export {};
