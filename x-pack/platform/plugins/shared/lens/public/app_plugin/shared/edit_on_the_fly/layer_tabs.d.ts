import React from 'react';
import type { Visualization } from '@kbn/lens-common';
import type { LayerTabsProps } from './types';
export declare const LENS_LAYER_TABS_CONTENT_ID = "lnsLayerTabsContent";
export declare const LayerTabsWrapper: React.NamedExoticComponent<LayerTabsProps>;
export declare function LayerTabs({ activeVisualization, attributes, coreStart, framePublicAPI, uiActions, }: LayerTabsProps & {
    activeVisualization: Visualization;
}): React.JSX.Element;
