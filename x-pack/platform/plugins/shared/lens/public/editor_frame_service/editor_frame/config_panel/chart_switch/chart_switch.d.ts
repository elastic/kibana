import React from 'react';
import type { FramePublicAPI, VisualizationMap } from '@kbn/lens-common';
export interface ChartSwitchProps {
    filteredVisualizationMap: VisualizationMap;
    framePublicAPI: FramePublicAPI;
    layerId: string;
    onChartSelect: () => void;
}
export declare const ChartSwitch: React.NamedExoticComponent<ChartSwitchProps>;
