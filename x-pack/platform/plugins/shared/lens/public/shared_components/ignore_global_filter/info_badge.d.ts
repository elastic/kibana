import React from 'react';
import type { FramePublicAPI, VisualizationInfo } from '@kbn/lens-common';
export declare function IgnoredGlobalFiltersEntries({ layers, visualizationInfo, dataViews, }: {
    layers: Array<{
        layerId: string;
        indexPatternId: string;
    }>;
    visualizationInfo: VisualizationInfo;
    dataViews: FramePublicAPI['dataViews'];
}): React.JSX.Element;
