import React from 'react';
import type { HeatmapSortPredicate } from '@kbn/lens-common/visualizations/heatmap/types';
export interface AxisSortOrderProps {
    sortPredicate?: HeatmapSortPredicate;
    disabled?: boolean;
    disabledReason?: string;
    dataTestSubj: string;
    onSortingChange: (sortPredicate?: HeatmapSortPredicate) => void;
}
export declare function AxisSortOrder({ sortPredicate, disabled, disabledReason, dataTestSubj, onSortingChange, }: AxisSortOrderProps): React.JSX.Element;
