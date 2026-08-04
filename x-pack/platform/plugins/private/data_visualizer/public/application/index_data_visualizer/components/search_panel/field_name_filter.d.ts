import type { FC } from 'react';
import type { OverallStats } from '../../types/overall_stats';
interface Props {
    overallStats: OverallStats;
    setVisibleFieldNames(q: string[]): void;
    visibleFieldNames: string[];
    showEmptyFields: boolean;
}
export declare const DataVisualizerFieldNamesFilter: FC<Props>;
export {};
