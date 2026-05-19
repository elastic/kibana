import type { ReactElement } from 'react';
import type { Feature } from 'geojson';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ISearchSource } from '@kbn/data-plugin/common/search/search_source';
import type { DataView } from '@kbn/data-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { type ProjectRouting } from '@kbn/es-query';
import { GRID_RESOLUTION, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import type { ESAggsSourceSyncMeta } from '../es_agg_source';
import { AbstractESAggSource } from '../es_agg_source';
import { LICENSED_FEATURES } from '../../../licensed_features';
import type { GetFeatureActionsArgs, GeoJsonWithMeta, IMvtVectorSource } from '../vector_source';
import type { DataFilters, ESGeoGridSourceDescriptor, MapExtent, TooltipFeatureAction, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { ImmutableSourceProperty, SourceEditorArgs } from '../source';
type ESGeoGridSourceSyncMeta = ESAggsSourceSyncMeta & Pick<ESGeoGridSourceDescriptor, 'requestType' | 'resolution'> & {
    geogridPrecision: number;
};
export declare const clustersTitle: string;
export declare const heatmapTitle: string;
export declare class ESGeoGridSource extends AbstractESAggSource implements IMvtVectorSource {
    static createDescriptor(descriptor: Partial<ESGeoGridSourceDescriptor>): ESGeoGridSourceDescriptor & Required<Pick<ESGeoGridSourceDescriptor, 'metrics'>>;
    readonly _descriptor: ESGeoGridSourceDescriptor & Required<Pick<ESGeoGridSourceDescriptor, 'metrics'>>;
    constructor(descriptor: Partial<ESGeoGridSourceDescriptor>);
    getBucketsName(): string;
    getGeoFieldName(): string;
    renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any>;
    getSyncMeta(dataFilters: DataFilters): ESGeoGridSourceSyncMeta;
    getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
    isMvt(): boolean;
    isGeoGridPrecisionAware(): boolean;
    supportsJoins(): boolean;
    getGridResolution(): GRID_RESOLUTION;
    getGeoGridPrecision(zoom: number): number;
    _getGeoGridPrecisionResolutionDelta(): 2 | 3 | 5 | 4 | 8;
    _compositeAggRequest({ searchSource, searchSessionId, indexPattern, precision, layerName, registerCancelCallback, bucketsPerGrid, isRequestStillActive, bufferedExtent, inspectorAdapters, executionContext, onWarning, fetchOptions, }: {
        searchSource: ISearchSource;
        searchSessionId?: string;
        indexPattern: DataView;
        precision: number;
        layerName: string;
        registerCancelCallback: (callback: () => void) => void;
        bucketsPerGrid: number;
        isRequestStillActive: () => boolean;
        bufferedExtent: MapExtent;
        inspectorAdapters: Adapters;
        executionContext: KibanaExecutionContext;
        onWarning: (warning: SearchResponseWarning) => void;
        fetchOptions?: {
            projectRouting?: ProjectRouting;
        };
    }): Promise<Feature<import("geojson").Geometry, import("geojson").GeoJsonProperties>[]>;
    _nonCompositeAggRequest({ searchSource, searchSessionId, indexPattern, precision, layerName, registerCancelCallback, bufferedExtent, tooManyBuckets, inspectorAdapters, executionContext, onWarning, fetchOptions, }: {
        searchSource: ISearchSource;
        searchSessionId?: string;
        indexPattern: DataView;
        precision: number;
        layerName: string;
        registerCancelCallback: (callback: () => void) => void;
        bufferedExtent: MapExtent;
        tooManyBuckets: boolean;
        inspectorAdapters: Adapters;
        executionContext: KibanaExecutionContext;
        onWarning: (warning: SearchResponseWarning) => void;
        fetchOptions?: {
            projectRouting?: ProjectRouting;
        };
    }): Promise<Feature[]>;
    _isGeoShape(): Promise<boolean>;
    getGeoJsonWithMeta(layerName: string, requestMeta: VectorSourceRequestMeta, registerCancelCallback: (callback: () => void) => void, isRequestStillActive: () => boolean, inspectorAdapters: Adapters): Promise<GeoJsonWithMeta>;
    getTileSourceLayer(): string;
    getTileUrl(requestMeta: VectorSourceRequestMeta, refreshToken: string, hasLabels: boolean, buffer: number): Promise<string>;
    isFilterByMapBounds(): boolean;
    hasTooltipProperties(): boolean;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
    getFeatureActions({ addFilters, featureId, geoFieldNames, onClose, }: GetFeatureActionsArgs): TooltipFeatureAction[];
}
export {};
