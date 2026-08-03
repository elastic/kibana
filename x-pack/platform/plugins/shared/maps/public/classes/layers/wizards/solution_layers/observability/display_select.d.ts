import React from 'react';
import type { OBSERVABILITY_LAYER_TYPE } from './layer_select';
export declare enum DISPLAY {
    CHOROPLETH = "CHOROPLETH",
    CLUSTERS = "CLUSTERS",
    GRIDS = "GRIDS",
    HEATMAP = "HEATMAP"
}
interface Props {
    layer: OBSERVABILITY_LAYER_TYPE | null;
    value: DISPLAY;
    onChange: (display: DISPLAY) => void;
}
export declare function DisplaySelect(props: Props): React.JSX.Element | null;
export {};
