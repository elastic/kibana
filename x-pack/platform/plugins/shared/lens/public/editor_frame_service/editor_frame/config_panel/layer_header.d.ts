import React from 'react';
import type { VisualizationLayerWidgetProps } from '@kbn/lens-common';
export declare function LayerHeader({ activeVisualizationId, layerConfigProps, onlyAllowSwitchToSubtypes, }: {
    activeVisualizationId: string;
    layerConfigProps: VisualizationLayerWidgetProps;
    onlyAllowSwitchToSubtypes?: boolean;
}): React.JSX.Element | null;
