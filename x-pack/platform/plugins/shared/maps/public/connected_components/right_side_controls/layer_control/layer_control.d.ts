import React from 'react';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    isReadOnly: boolean;
    isLayerTOCOpen: boolean;
    layerList: ILayer[];
    isFlyoutOpen: boolean;
    showAddLayerWizard: () => Promise<void>;
    closeLayerTOC: () => void;
    openLayerTOC: () => void;
    hideAllLayers: () => void;
    showAllLayers: () => void;
    zoom: number;
}
export declare function LayerControl({ isReadOnly, isLayerTOCOpen, showAddLayerWizard, closeLayerTOC, openLayerTOC, layerList, isFlyoutOpen, hideAllLayers, showAllLayers, zoom, }: Props): React.JSX.Element | null;
