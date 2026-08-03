import React from 'react';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { HeatmapVisualizationState } from '../types';
export declare const HeatmapLegendSettings: ({ state, setState, frame, }: VisualizationToolbarProps<HeatmapVisualizationState>) => React.JSX.Element;
export declare const legendOptions: Array<{
    id: string;
    value: 'auto' | 'show' | 'hide';
    label: string;
}>;
