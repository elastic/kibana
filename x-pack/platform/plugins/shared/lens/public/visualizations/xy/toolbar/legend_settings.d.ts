import React from 'react';
import type { XYLegendValue } from '@kbn/chart-expressions-common';
import type { VisualizationToolbarProps, XYVisualizationState } from '@kbn/lens-common';
export declare const defaultLegendTitle: string;
export declare const XyLegendSettings: ({ state, setState, frame, }: VisualizationToolbarProps<XYVisualizationState>) => React.JSX.Element;
export declare const legendOptions: Array<{
    id: string;
    value: 'auto' | 'show' | 'hide';
    label: string;
}>;
export declare const xyLegendValues: Array<{
    value: XYLegendValue;
    label: string;
    toolTipContent: string;
}>;
