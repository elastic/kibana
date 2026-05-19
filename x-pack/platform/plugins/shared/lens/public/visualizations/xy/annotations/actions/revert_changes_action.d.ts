import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { LayerAction, StateSetter } from '@kbn/lens-common';
import type { XYVisualizationState, XYByReferenceAnnotationLayerConfig } from '../../types';
export declare const getRevertChangesAction: ({ state, layer, setState, core, }: {
    state: XYVisualizationState;
    layer: XYByReferenceAnnotationLayerConfig;
    setState: StateSetter<XYVisualizationState, unknown>;
    core: Pick<CoreStart, "overlays" | "analytics" | "i18n" | "theme" | "notifications" | "userProfile">;
}) => LayerAction;
export declare const revert: ({ setState, layer, state, modal, toasts, }: {
    setState: StateSetter<XYVisualizationState>;
    layer: XYByReferenceAnnotationLayerConfig;
    state: XYVisualizationState;
    modal: OverlayRef;
    toasts: IToasts;
}) => void;
