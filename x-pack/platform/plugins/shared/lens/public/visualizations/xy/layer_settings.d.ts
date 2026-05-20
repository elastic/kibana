import React from 'react';
import type { VisualizationLayerSettingsProps } from '@kbn/lens-common';
import type { XYVisualizationState } from './types';
export declare function LayerSettings({ state, setState, section, layerId, }: VisualizationLayerSettingsProps<XYVisualizationState> & {
    section: 'data' | 'appearance';
}): React.JSX.Element | null;
