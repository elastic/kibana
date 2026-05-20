import React from 'react';
import { LegendSize } from '@kbn/chart-expressions-common';
export interface LegendSizeSettingsProps {
    legendSize?: LegendSize;
    onLegendSizeChange: (size?: LegendSize) => void;
    isVerticalLegend: boolean;
    showAutoOption: boolean;
}
export declare const LegendSizeSettings: ({ legendSize, onLegendSizeChange, isVerticalLegend, showAutoOption, }: LegendSizeSettingsProps) => React.JSX.Element | null;
