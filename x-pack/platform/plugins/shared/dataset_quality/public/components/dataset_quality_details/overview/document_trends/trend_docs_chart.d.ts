import React from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import type { TimeRangeConfig } from '../../../../../common/types';
import type { useQualityIssuesDocsChart } from '../../../../hooks';
interface TrendDocsChartProps extends Pick<ReturnType<typeof useQualityIssuesDocsChart>, 'attributes' | 'isChartLoading' | 'onChartLoading' | 'extraActions'> {
    timeRange: TimeRangeConfig;
    lastReloadTime: number;
    onTimeRangeChange: (props: Pick<OnTimeChangeProps, 'start' | 'end'>) => void;
}
export declare function TrendDocsChart({ attributes, isChartLoading, onChartLoading, extraActions, timeRange, lastReloadTime, onTimeRangeChange, }: TrendDocsChartProps): React.JSX.Element;
export {};
