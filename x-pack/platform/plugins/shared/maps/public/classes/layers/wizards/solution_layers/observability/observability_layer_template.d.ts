import React, { Component } from 'react';
import type { RenderWizardArguments } from '../../layer_wizard_registry';
import type { OBSERVABILITY_LAYER_TYPE } from './layer_select';
import type { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DISPLAY } from './display_select';
interface State {
    display: DISPLAY;
    layer: OBSERVABILITY_LAYER_TYPE | null;
    metric: OBSERVABILITY_METRIC_TYPE | null;
}
export declare class ObservabilityLayerTemplate extends Component<RenderWizardArguments, State> {
    state: {
        layer: null;
        metric: null;
        display: DISPLAY;
    };
    _onLayerChange: (layer: OBSERVABILITY_LAYER_TYPE) => void;
    _onMetricChange: (metric: OBSERVABILITY_METRIC_TYPE) => void;
    _onDisplayChange: (display: DISPLAY) => void;
    _previewLayer(): void;
    render(): React.JSX.Element;
}
export {};
