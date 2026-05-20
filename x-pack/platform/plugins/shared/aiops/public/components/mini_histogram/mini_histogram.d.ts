import type { FC } from 'react';
import type { SignificantItemHistogramItem } from '@kbn/ml-agg-utils';
interface MiniHistogramProps {
    chartData?: SignificantItemHistogramItem[];
    isLoading: boolean;
    label: string;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
}
export declare const MiniHistogram: FC<MiniHistogramProps>;
export {};
