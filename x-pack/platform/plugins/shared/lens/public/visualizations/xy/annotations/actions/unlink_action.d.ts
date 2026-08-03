import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { LayerAction, StateSetter } from '@kbn/lens-common';
import type { XYByReferenceAnnotationLayerConfig, XYVisualizationState } from '../../types';
export declare const getUnlinkLayerAction: ({ state, layer, setState, toasts, }: {
    state: XYVisualizationState;
    layer: XYByReferenceAnnotationLayerConfig;
    setState: StateSetter<XYVisualizationState, unknown>;
    toasts: ToastsStart;
}) => LayerAction;
