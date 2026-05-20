import React from 'react';
import type { FramePublicAPI, VisualizationInfo } from '@kbn/lens-common';
import type { FormBasedLayer } from '../..';
export declare function ReducedSamplingSectionEntries({ layers, visualizationInfo, dataViews, }: {
    layers: Array<[string, FormBasedLayer]>;
    visualizationInfo: VisualizationInfo;
    dataViews: FramePublicAPI['dataViews'];
}): React.JSX.Element;
