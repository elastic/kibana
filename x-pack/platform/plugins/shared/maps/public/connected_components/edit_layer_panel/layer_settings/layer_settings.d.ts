import React from 'react';
import type { Attribution } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    layer: ILayer;
    clearLayerAttribution: (layerId: string) => void;
    setLayerAttribution: (id: string, attribution: Attribution) => void;
    updateLabel: (layerId: string, label: string) => void;
    updateLocale: (layerId: string, locale: string) => void;
    updateMinZoom: (layerId: string, minZoom: number) => void;
    updateMaxZoom: (layerId: string, maxZoom: number) => void;
    updateAlpha: (layerId: string, alpha: number) => void;
    updateLabelsOnTop: (layerId: string, areLabelsOnTop: boolean) => void;
    updateIncludeInFitToBounds: (layerId: string, includeInFitToBounds: boolean) => void;
    updateDisableTooltips: (layerId: string, disableTooltips: boolean) => void;
    supportsFitToBounds: boolean;
}
export declare function LayerSettings(props: Props): React.JSX.Element;
