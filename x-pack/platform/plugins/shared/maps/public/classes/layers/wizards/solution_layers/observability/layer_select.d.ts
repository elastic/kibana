import React from 'react';
export declare enum OBSERVABILITY_LAYER_TYPE {
    APM_RUM_PERFORMANCE = "APM_RUM_PERFORMANCE",
    APM_RUM_TRAFFIC = "APM_RUM_TRAFFIC"
}
interface Props {
    value: OBSERVABILITY_LAYER_TYPE | null;
    onChange: (layer: OBSERVABILITY_LAYER_TYPE) => void;
}
export declare function LayerSelect(props: Props): React.JSX.Element;
export {};
