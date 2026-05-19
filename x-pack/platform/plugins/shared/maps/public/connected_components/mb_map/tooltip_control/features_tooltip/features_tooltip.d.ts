import type { ReactNode } from 'react';
import React, { Component } from 'react';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { GeoJsonProperties } from 'geojson';
import type { Filter } from '@kbn/es-query';
import type { RawValue } from '../../../../../common/constants';
import type { TooltipFeature } from '../../../../../common/descriptor_types';
import type { ITooltipProperty } from '../../../../classes/tooltips/tooltip_property';
import type { IVectorLayer } from '../../../../classes/layers/vector_layer';
interface Props {
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
    closeTooltip: () => void;
    features: TooltipFeature[];
    isLocked: boolean;
    loadFeatureProperties: ({ layerId, properties, }: {
        layerId: string;
        properties: GeoJsonProperties;
    }) => Promise<ITooltipProperty[]>;
    getLayerName: (layerId: string) => Promise<string | null>;
    findLayerById: (layerId: string) => IVectorLayer | undefined;
}
interface State {
    currentFeature: TooltipFeature | null;
    filterView: ReactNode | null;
    prevFeatures: TooltipFeature[];
    view: string;
}
export declare class FeaturesTooltip extends Component<Props, State> {
    state: State;
    static getDerivedStateFromProps(nextProps: Props, prevState: State): {
        currentFeature: TooltipFeature | null;
        view: string;
        prevFeatures: TooltipFeature[];
    } | null;
    _setCurrentFeature: (feature: TooltipFeature) => void;
    _showPropertiesView: () => void;
    _showFilterActionsView: (filterView: ReactNode) => void;
    _renderActions(): React.JSX.Element[] | null;
    _renderBackButton(label: string): React.JSX.Element;
    render(): React.JSX.Element | null;
}
export {};
