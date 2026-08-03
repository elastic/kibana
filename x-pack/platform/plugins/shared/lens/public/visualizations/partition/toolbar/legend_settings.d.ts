import React from 'react';
import type { LensPartitionVisualizationState as PieVisualizationState, SharedPartitionLayerState as SharedPieLayerState, VisualizationToolbarProps } from '@kbn/lens-common';
export declare const PartitionLegendSettings: ({ state, setState, frame, }: VisualizationToolbarProps<PieVisualizationState>) => React.JSX.Element;
export declare const partitionLegendValues: {
    value: "value";
    label: string;
}[];
export declare const legendOptions: Array<{
    value: SharedPieLayerState['legendDisplay'];
    label: string;
    id: string;
}>;
