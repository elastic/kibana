import type { ReactNode } from 'react';
import type { GeoJsonProperties, Geometry } from 'geojson';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { RawValue } from '../../../common/constants';
import type { TooltipFeature } from '../../../common/descriptor_types';
export interface ITooltipProperty {
    getPropertyKey(): string;
    getPropertyName(): string | ReactNode;
    getHtmlDisplayValue(): ReactNode;
    getRawValue(): string | string[] | undefined;
    isFilterable(): boolean;
    getESFilters(): Promise<Filter[]>;
}
export interface LoadFeatureProps {
    layerId: string;
    featureId?: number | string;
}
export interface FeatureGeometry {
    coordinates: [number];
    type: string;
}
export interface RenderTooltipContentParams {
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    closeTooltip: () => void;
    features: TooltipFeature[];
    getActionContext?: () => ActionExecutionContext;
    getFilterActions?: () => Promise<Action[]>;
    getLayerName: (layerId: string) => Promise<string | null>;
    isLocked: boolean;
    loadFeatureProperties: ({ layerId, properties, }: {
        layerId: string;
        properties: GeoJsonProperties;
    }) => Promise<ITooltipProperty[]>;
    loadFeatureGeometry: ({ layerId, featureId, }: {
        layerId: string;
        featureId?: string | number;
    }) => Geometry | null;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
}
export type RenderToolTipContent = (params: RenderTooltipContentParams) => JSX.Element;
export declare class TooltipProperty implements ITooltipProperty {
    private readonly _propertyKey;
    private readonly _rawValue;
    private readonly _propertyName;
    constructor(propertyKey: string, propertyName: string, rawValue: string | string[] | undefined);
    getPropertyKey(): string;
    getPropertyName(): string;
    getHtmlDisplayValue(): string;
    getRawValue(): string | string[] | undefined;
    isFilterable(): boolean;
    getESFilters(): Promise<Filter[]>;
}
