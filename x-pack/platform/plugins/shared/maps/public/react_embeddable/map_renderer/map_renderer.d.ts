import React from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { LayerDescriptor, MapCenterAndZoom, MapSettings } from '../../../common/descriptor_types';
import type { MapApi } from '../types';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
export interface Props {
    title?: string;
    filters?: Filter[];
    query?: Query;
    timeRange?: TimeRange;
    layerList: LayerDescriptor[];
    mapSettings?: Partial<MapSettings>;
    hideFilterActions?: boolean;
    isLayerTOCOpen?: boolean;
    mapCenter?: MapCenterAndZoom;
    getTooltipRenderer?: () => RenderToolTipContent;
    onApiAvailable?: (api: MapApi) => void;
    isSharable?: boolean;
}
export declare function MapRenderer(props: Props): React.JSX.Element;
