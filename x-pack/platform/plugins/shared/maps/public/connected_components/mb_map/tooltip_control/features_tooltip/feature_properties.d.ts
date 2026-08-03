import type { ReactNode } from 'react';
import React, { Component } from 'react';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { GeoJsonProperties } from 'geojson';
import type { Filter } from '@kbn/es-query';
import type { RawValue } from '../../../../../common/constants';
import type { ITooltipProperty } from '../../../../classes/tooltips/tooltip_property';
interface Props {
    featureId?: string | number;
    layerId: string;
    mbProperties: GeoJsonProperties;
    loadFeatureProperties: ({ layerId, properties, }: {
        layerId: string;
        properties: GeoJsonProperties;
    }) => Promise<ITooltipProperty[]>;
    showFilterButtons: boolean;
    onCloseTooltip: () => void;
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
    showFilterActions: (view: ReactNode) => void;
}
interface State {
    properties: ITooltipProperty[] | null;
    actions: Action[];
    loadPropertiesErrorMsg: string | null;
    prevWidth: number | null;
    prevHeight: number | null;
}
export declare class FeatureProperties extends Component<Props, State> {
    private _isMounted;
    private _prevLayerId;
    private _prevFeatureId?;
    private _prevMbProperties?;
    private readonly _tableRef;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _loadActions(): Promise<void>;
    _loadProperties: () => Promise<void>;
    _showFilterActions: (tooltipProperty: ITooltipProperty, getActionContext: () => ActionExecutionContext, addFilters: (filters: Filter[], actionId: string) => Promise<void>) => void;
    _fetchProperties: ({ nextLayerId, nextFeatureId, mbProperties, }: {
        nextLayerId: string;
        nextFeatureId?: string | number;
        mbProperties: GeoJsonProperties;
    }) => Promise<void>;
    _renderFilterActions(tooltipProperty: ITooltipProperty, getActionContext: () => ActionExecutionContext, addFilters: (filters: Filter[], actionId: string) => Promise<void>): React.JSX.Element;
    _renderFilterCell(tooltipProperty: ITooltipProperty): React.JSX.Element;
    render(): React.JSX.Element;
}
interface MapFeatureTooltipRowProps {
    children: ReactNode;
    className?: string;
}
export declare const MapFeatureTooltipRow: ({ children, className }: MapFeatureTooltipRowProps) => React.JSX.Element;
export {};
