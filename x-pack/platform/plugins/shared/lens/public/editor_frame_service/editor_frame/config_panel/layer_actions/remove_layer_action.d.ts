import type { LayerAction, LensStartServices as StartServices, LensLayerType as LayerType } from '@kbn/lens-common';
interface RemoveLayerAction {
    execute: () => void;
    layerIndex: number;
    layerType?: LayerType;
    isOnlyLayer: boolean;
    core: StartServices;
    customModalText?: {
        title?: string;
        description?: string;
    };
}
export declare const getRemoveLayerAction: (props: RemoveLayerAction) => LayerAction;
export {};
