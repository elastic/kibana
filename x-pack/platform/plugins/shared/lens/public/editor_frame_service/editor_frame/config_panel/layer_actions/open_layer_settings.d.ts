import type { LayerAction } from '@kbn/lens-common';
export declare const getOpenLayerSettingsAction: (props: {
    openLayerSettings: () => void;
    hasLayerSettings: boolean;
}) => LayerAction;
