import React, { Component } from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { GeoJsonProperties, Geometry } from 'geojson';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { RawValue } from '../../../../common/constants';
import type { IVectorLayer } from '../../../classes/layers/vector_layer';
import type { TooltipFeature } from '../../../../common/descriptor_types';
import type { RenderToolTipContent } from '../../../classes/tooltips/tooltip_property';
interface Props {
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    closeTooltip: () => void;
    features: TooltipFeature[];
    findLayerById: (layerId: string) => IVectorLayer | undefined;
    getActionContext?: () => ActionExecutionContext;
    getFilterActions?: () => Promise<Action[]>;
    index: number;
    isLocked: boolean;
    loadFeatureGeometry: ({ layerId, featureId, }: {
        layerId: string;
        featureId?: string | number;
    }) => Geometry | null;
    location: [number, number];
    mbMap: MbMap;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
    renderTooltipContent?: RenderToolTipContent;
    executionContext: KibanaExecutionContext;
}
interface State {
    x?: number;
    y?: number;
}
export declare class TooltipPopover extends Component<Props, State> {
    private readonly _popoverRef;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _updatePopoverPosition: () => void;
    _loadFeatureProperties: ({ layerId, properties, }: {
        layerId: string;
        properties: GeoJsonProperties;
    }) => Promise<import("../../../classes/tooltips/tooltip_property").ITooltipProperty[]>;
    _getLayerName: (layerId: string) => Promise<string | null>;
    _renderTooltipContent: () => React.JSX.Element;
    render(): React.JSX.Element | null;
}
export {};
