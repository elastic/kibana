import React from 'react';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { XYVisualizationState } from '../../types';
export declare function getValueLabelDisableReason({ isAreaPercentage, isHistogramSeries, }: {
    isAreaPercentage: boolean;
    isHistogramSeries: boolean;
}): string;
export declare const XyAppearanceSettings: React.FC<VisualizationToolbarProps<XYVisualizationState>>;
