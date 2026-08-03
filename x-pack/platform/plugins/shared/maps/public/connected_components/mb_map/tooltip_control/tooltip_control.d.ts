import _ from 'lodash';
import React, { Component } from 'react';
import type { Map as MbMap, MapGeoJSONFeature, MapMouseEvent, MapSourceDataEvent, Point2D } from '@kbn/mapbox-gl';
import type { Geometry } from 'geojson';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { RawValue } from '../../../../common/constants';
import type { TooltipFeature, TooltipState } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
import type { IVectorLayer } from '../../../classes/layers/vector_layer';
import type { RenderToolTipContent } from '../../../classes/tooltips/tooltip_property';
export interface Props {
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    closeOnClickTooltip: (tooltipId: string) => void;
    closeOnHoverTooltip: () => void;
    getActionContext?: () => ActionExecutionContext;
    getFilterActions?: () => Promise<Action[]>;
    geoFieldNames: string[];
    hasLockedTooltips: boolean;
    filterModeActive: boolean;
    drawModeActive: boolean;
    layerList: ILayer[];
    mbMap: MbMap;
    openOnClickTooltip: (tooltipState: TooltipState) => void;
    openOnHoverTooltip: (tooltipState: TooltipState) => void;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
    openTooltips: TooltipState[];
    renderTooltipContent?: RenderToolTipContent;
    updateOpenTooltips: (openTooltips: TooltipState[]) => void;
    executionContext: KibanaExecutionContext;
}
export declare class TooltipControl extends Component<Props, {}> {
    private _isMapRemoved;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _setIsMapRemoved: () => void;
    _onSourceData: (e: MapSourceDataEvent) => void;
    _updateOpentooltips: _.DebouncedFunc<() => void>;
    _onMouseout: () => void;
    _findLayerById: (layerId: string) => IVectorLayer;
    _getFeatureGeometry: ({ layerId, featureId, }: {
        layerId: string;
        featureId?: string | number;
    }) => Geometry | null;
    _getLayerByMbLayerId(mbLayerId: string): IVectorLayer | undefined;
    _getTooltipFeatures(mbFeatures: MapGeoJSONFeature[], isLocked: boolean, tooltipId: string): TooltipFeature[];
    _lockTooltip: (e: MapMouseEvent) => void;
    _updateHoverTooltipState: _.DebouncedFunc<(e: MapMouseEvent) => void>;
    _getMbLayerIdsForTooltips(): string[];
    _getMbFeaturesUnderPointer(mbLngLatPoint: Point2D): MapGeoJSONFeature[];
    render(): React.JSX.Element[] | null;
}
