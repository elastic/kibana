import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { FilterSpecification, Map as MbMap } from '@kbn/mapbox-gl';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Position } from 'geojson';
import type { ProjectRoutingOverrides } from '@kbn/presentation-publishing';
import { AbstractLayer } from '../layer';
import type { IVectorStyle } from '../../styles/vector/vector_style';
import { VectorStyle } from '../../styles/vector/vector_style';
import type { TimesliceMaskConfig } from '../../util/mb_filter_expressions';
import type { CustomIcon, DynamicStylePropertyOptions, DataFilters, StyleMetaDescriptor, VectorLayerDescriptor, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { IVectorSource } from '../../sources/vector_source';
import type { LayerIcon, ILayer, LayerMessage } from '../layer';
import type { InnerJoin } from '../../joins/inner_join';
import type { IField } from '../../fields/field';
import type { DataRequestContext } from '../../../actions';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import type { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import type { IJoinSource } from '../../sources/join_sources';
import type { JoinState } from './types';
import { Mask } from './mask';
export declare function isVectorLayer(layer: ILayer): layer is IVectorLayer;
export declare function hasVectorLayerMethod(layer: ILayer, methodName: keyof IVectorLayer): layer is Pick<IVectorLayer, typeof methodName>;
export interface VectorLayerArguments {
    source: IVectorSource;
    joins?: InnerJoin[];
    layerDescriptor: Partial<VectorLayerDescriptor>;
    customIcons: CustomIcon[];
    chartsPaletteServiceGetColor?: (value: string) => string | null;
}
export interface IVectorLayer extends ILayer {
    getMbTooltipLayerIds(): string[];
    getFields(): Promise<IField[]>;
    getStyleEditorFields(): Promise<IField[]>;
    getJoins(): InnerJoin[];
    getValidJoins(): InnerJoin[];
    getSource(): IVectorSource;
    getFeatureId(feature: Feature): string | number | undefined;
    getFeatureById(id: string | number): Feature | null;
    getPropertiesForTooltip(properties: GeoJsonProperties, executionContext: KibanaExecutionContext): Promise<ITooltipProperty[]>;
    hasJoins(): boolean;
    canShowTooltip(): boolean;
    areTooltipsDisabled(): boolean;
    supportsFeatureEditing(): boolean;
    getLeftJoinFields(): Promise<IField[]>;
    addFeature(geometry: Geometry | Position[]): Promise<void>;
    deleteFeature(featureId: string): Promise<void>;
    getMasks(): Mask[];
}
export declare const noResultsIcon: React.JSX.Element;
export declare const NO_RESULTS_ICON_AND_TOOLTIPCONTENT: {
    icon: React.JSX.Element;
    tooltipContent: string;
};
export declare class AbstractVectorLayer extends AbstractLayer implements IVectorLayer {
    protected readonly _style: VectorStyle;
    private readonly _joins;
    protected readonly _descriptor: VectorLayerDescriptor;
    private readonly _masks;
    static createDescriptor(options: Partial<VectorLayerDescriptor>, mapColors?: string[]): VectorLayerDescriptor;
    constructor({ layerDescriptor, source, joins, customIcons, chartsPaletteServiceGetColor, }: VectorLayerArguments);
    cloneDescriptor(): Promise<VectorLayerDescriptor[]>;
    getSource(): IVectorSource;
    getStyleForEditing(): IVectorStyle;
    getStyle(): IVectorStyle;
    getCurrentStyle(): VectorStyle;
    getJoins(): InnerJoin[];
    getValidJoins(): InnerJoin[];
    supportsFeatureEditing(): boolean;
    hasJoins(): boolean;
    _isLoadingJoins(): boolean;
    _getSourceErrorTitle(): string;
    getErrors(inspectorAdapters: Adapters): LayerMessage[];
    getLayerIcon(isTocIcon: boolean): LayerIcon;
    getLayerTypeIconName(): string;
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
    getBounds(getDataRequestContext: (layerId: string) => DataRequestContext): Promise<import("../../../../common/descriptor_types").MapExtent | null>;
    getLeftJoinFields(): Promise<IField[]>;
    _getJoinFields(): IField[];
    getFields(): Promise<IField[]>;
    getStyleEditorFields(): Promise<IField[]>;
    getIndexPatternIds(): string[];
    getQueryableIndexPatternIds(): string[];
    getProjectRoutingOverrides(): Promise<ProjectRoutingOverrides>;
    isFilteredByGlobalTime(): Promise<boolean>;
    _getVectorSourceRequestMeta(isForceRefresh: boolean, dataFilters: DataFilters, source: IVectorSource, style: IVectorStyle, isFeatureEditorOpenForLayer: boolean): Promise<VectorSourceRequestMeta>;
    _syncSourceStyleMeta(syncContext: DataRequestContext, source: IVectorSource, style: IVectorStyle): Promise<void>;
    _syncStyleMeta({ source, style, sourceQuery, dataRequestId, dynamicStyleProps, dataFilters, startLoading, stopLoading, onLoadError, registerCancelCallback, inspectorAdapters, }: {
        dataRequestId: string;
        dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
        source: IVectorSource | IJoinSource;
        sourceQuery?: Query;
        style: IVectorStyle;
    } & DataRequestContext): Promise<void>;
    _syncSourceFormatters(syncContext: DataRequestContext, source: IVectorSource, style: IVectorStyle): Promise<void>;
    _syncFormatters({ source, dataRequestId, fields, startLoading, stopLoading, onLoadError, }: {
        dataRequestId: string;
        fields: IField[];
        source: IVectorSource | IJoinSource;
    } & DataRequestContext): Promise<void>;
    _syncJoin({ join, joinIndex, featureCollection, startLoading, stopLoading, onLoadError, registerCancelCallback, dataFilters, isForceRefresh, isFeatureEditorOpenForLayer, inspectorAdapters, }: {
        join: InnerJoin;
        joinIndex: number;
        featureCollection?: FeatureCollection;
    } & DataRequestContext): Promise<JoinState>;
    _syncJoins(syncContext: DataRequestContext, style: IVectorStyle, featureCollection?: FeatureCollection): Promise<JoinState[]>;
    _syncJoinStyleMeta(syncContext: DataRequestContext, join: InnerJoin, style: IVectorStyle): Promise<void>;
    _syncJoinFormatters(syncContext: DataRequestContext, join: InnerJoin, style: IVectorStyle): Promise<void>;
    _syncSupportsFeatureEditing({ syncContext, source, }: {
        syncContext: DataRequestContext;
        source: IVectorSource;
    }): Promise<void>;
    _getJoinFilterExpression(): FilterSpecification | undefined;
    _createMasks(): Mask[];
    getMasks(): Mask[];
    _getAlphaExpression(): number | unknown[];
    _setMbPointsProperties(mbMap: MbMap, mvtSourceLayer?: string, timesliceMaskConfig?: TimesliceMaskConfig): void;
    _setMbLinePolygonProperties(mbMap: MbMap, mvtSourceLayer?: string, timesliceMaskConfig?: TimesliceMaskConfig): void;
    _setMbLabelProperties(mbMap: MbMap, mvtSourceLayer?: string, timesliceMaskConfig?: TimesliceMaskConfig): void;
    _getMbPointLayerId(): string;
    _getMbLabelLayerId(): string;
    _getMbSymbolLayerId(): string;
    _getMbLineLayerId(): string;
    _getMbPolygonLayerId(): string;
    getMbTooltipLayerIds(): string[];
    getMbLayerIds(): string[];
    ownsMbLayerId(mbLayerId: string): boolean;
    ownsMbSourceId(mbSourceId: string): boolean;
    _addJoinsToSourceTooltips(tooltipsFromSource: ITooltipProperty[]): void;
    getPropertiesForTooltip(properties: GeoJsonProperties, executionContext: KibanaExecutionContext): Promise<ITooltipProperty[]>;
    /**
     * Check if there are any properties we can display in a tooltip. If `false` the "Show tooltips" switch
     * is disabled in Layer settings.
     * @returns {boolean}
     */
    canShowTooltip(): boolean;
    /**
     * Users can toggle tooltips on hover or click in the Layer settings. Tooltips are enabled by default.
     * @returns {boolean}
     */
    areTooltipsDisabled(): boolean;
    getFeatureId(feature: Feature): string | number | undefined;
    getFeatureById(id: string | number): Feature | null;
    getLicensedFeatures(): Promise<import("../../../licensed_features").LICENSED_FEATURES[]>;
    addFeature(geometry: Geometry | Position[]): Promise<void>;
    deleteFeature(featureId: string): Promise<void>;
    getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null>;
}
