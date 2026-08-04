import type { ReactElement } from 'react';
import type { FeatureCollection, GeoJsonProperties, Geometry, Position } from 'geojson';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common';
import type { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import type { Filter, ProjectRouting } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { IVectorStyle } from '../../styles/vector/vector_style';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import type { TooltipFeatureAction } from '../../../../common/descriptor_types';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import type { ISource } from '../source';
import { AbstractSource } from '../source';
import type { IField } from '../../fields/field';
import type { DataFilters, DataRequestMeta, MapExtent, Timeslice, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { DataRequest } from '../../util/data_request';
export declare function hasVectorSourceMethod(source: ISource, methodName: keyof IVectorSource): source is Pick<IVectorSource, typeof methodName>;
export interface SourceStatus {
    tooltipContent: string | null;
    areResultsTrimmed: boolean;
    isDeprecated?: boolean;
}
export interface GeoJsonWithMeta {
    data: FeatureCollection;
    meta?: DataRequestMeta;
}
export interface BoundsRequestMeta {
    applyGlobalQuery: boolean;
    applyGlobalTime: boolean;
    filters: Filter[];
    query?: Query;
    embeddableSearchContext?: {
        query?: Query;
        filters: Filter[];
    };
    sourceQuery?: Query;
    timeFilters: TimeRange;
    timeslice?: Timeslice;
    isFeatureEditorOpenForLayer: boolean;
    joinKeyFilter?: Filter;
    executionContext: KibanaExecutionContext;
    projectRouting?: ProjectRouting;
}
export interface GetFeatureActionsArgs {
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    featureId: string;
    geoFieldNames: string[];
    getActionContext?: () => ActionExecutionContext;
    getFilterActions?: () => Promise<Action[]>;
    getGeojsonGeometry: () => Geometry | null;
    mbFeature: MapGeoJSONFeature;
    onClose: () => void;
}
export interface IVectorSource extends ISource {
    isMvt(): boolean;
    getTooltipProperties(properties: GeoJsonProperties, executionContext: KibanaExecutionContext): Promise<ITooltipProperty[]>;
    getBoundsForFilters(layerDataFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    getGeoJsonWithMeta(layerName: string, requestMeta: VectorSourceRequestMeta, registerCancelCallback: (callback: () => void) => void, isRequestStillActive: () => boolean, inspectorAdapters: Adapters): Promise<GeoJsonWithMeta>;
    getFields(): Promise<IField[]>;
    getFieldByName(fieldName: string): IField | null;
    getLeftJoinFields(): Promise<IField[]>;
    supportsJoins(): boolean;
    getSyncMeta(dataFilters: DataFilters): object | null;
    hasTooltipProperties(): boolean;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    isBoundsAware(): boolean;
    getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus;
    getTimesliceMaskFieldName(): Promise<string | null>;
    supportsFeatureEditing(): Promise<boolean>;
    addFeature(geometry: Geometry | Position[]): Promise<void>;
    deleteFeature(featureId: string): Promise<void>;
    getFeatureActions({ addFilters, featureId, geoFieldNames, getActionContext, getFilterActions, getGeojsonGeometry, mbFeature, onClose, }: GetFeatureActionsArgs): TooltipFeatureAction[];
    getInspectorRequestIds(): string[];
    /**
     * specifies if a source provides its own legend details or if the default vector_style is used if the source has this method it must also implement renderLegendDetails
     */
    hasLegendDetails?(): Promise<boolean>;
    /**
     * specifies if a source provides its own legend details or if the default vector_style is used
     */
    renderLegendDetails?(vectorStyle: IVectorStyle): ReactElement<any> | null;
}
export declare class AbstractVectorSource extends AbstractSource implements IVectorSource {
    isMvt(): boolean;
    isFilterByMapBounds(): boolean;
    isBoundsAware(): boolean;
    supportsFitToBounds(): Promise<boolean>;
    getBoundsForFilters(boundsFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    getFields(): Promise<IField[]>;
    getFieldByName(fieldName: string): IField | null;
    getLeftJoinFields(): Promise<IField[]>;
    getGeoJsonWithMeta(layerName: string, requestMeta: VectorSourceRequestMeta, registerCancelCallback: (callback: () => void) => void, isRequestStillActive: () => boolean, inspectorAdapters: Adapters): Promise<GeoJsonWithMeta>;
    hasTooltipProperties(): boolean;
    getTooltipProperties(properties: GeoJsonProperties, executionContext: KibanaExecutionContext): Promise<ITooltipProperty[]>;
    isTimeAware(): Promise<boolean>;
    supportsJoins(): boolean;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus;
    getSyncMeta(dataFilters: DataFilters): object | null;
    getTimesliceMaskFieldName(): Promise<string | null>;
    addFeature(geometry: Geometry | Position[]): Promise<void>;
    deleteFeature(featureId: string): Promise<void>;
    supportsFeatureEditing(): Promise<boolean>;
    getFeatureActions({ addFilters, geoFieldNames, getActionContext, getFilterActions, getGeojsonGeometry, mbFeature, onClose, }: GetFeatureActionsArgs): TooltipFeatureAction[];
    getInspectorRequestIds(): string[];
}
