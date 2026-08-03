import React from 'react';
import type { FramePublicAPI, LensDocument, VisualizationMap } from '@kbn/lens-common';
export interface ChartSwitchProps {
    filteredVisualizationMap: VisualizationMap;
    framePublicAPI: FramePublicAPI;
    layerId: string;
    onChartSelect: () => void;
}
export declare const ChartSwitch: React.MemoExoticComponent<({ filteredVisualizationMap, framePublicAPI, layerId, onChartSelect, }: ChartSwitchProps) => React.JSX.Element>;
/**
 * Resolves the subtype-aware visualization type id a layer was saved with, or
 * `undefined` when the visualization was never saved.
 */
export declare const getPersistedLayerVisualizationTypeId: (persistedDoc: LensDocument | undefined, visualizationMap: VisualizationMap, layerId: string) => string | undefined;
