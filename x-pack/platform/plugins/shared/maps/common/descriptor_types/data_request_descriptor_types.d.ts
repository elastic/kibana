import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common';
import type { Filter, ProjectRouting } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { MapExtent } from './map_descriptor';
export type Timeslice = {
    from: number;
    to: number;
};
export type DataFilters = {
    buffer?: MapExtent;
    extent?: MapExtent;
    filters: Filter[];
    query?: Query;
    embeddableSearchContext?: {
        query?: Query;
        filters: Filter[];
    };
    searchSessionId?: string;
    timeFilters: TimeRange;
    timeslice?: Timeslice;
    zoom: number;
    isReadOnly: boolean;
    joinKeyFilter?: Filter;
    executionContext: KibanaExecutionContext;
    projectRouting?: ProjectRouting;
};
export type SourceRequestMeta = DataFilters & {
    applyGlobalQuery: boolean;
    applyGlobalTime: boolean;
    applyForceRefresh: boolean;
    sourceQuery?: Query;
    isForceRefresh: boolean;
};
export type VectorSourceRequestMeta = SourceRequestMeta & {
    fieldNames: string[];
    timesliceMaskField?: string;
    sourceMeta: object | null;
    isFeatureEditorOpenForLayer: boolean;
};
export type VectorStyleRequestMeta = DataFilters & {
    dynamicStyleFields: string[];
    isTimeAware: boolean;
    sourceQuery: Query;
    timeFilters: TimeRange;
};
export type ESSearchSourceResponseMeta = {
    areResultsTrimmed?: boolean;
    resultsCount?: number;
    timeExtent?: Timeslice;
    isTimeExtentForTimeslice?: boolean;
    areEntitiesTrimmed?: boolean;
    entityCount?: number;
    totalEntities?: number;
};
export type ESGeoLineSourceResponseMeta = {
    areResultsTrimmed: boolean;
    areEntitiesTrimmed: boolean;
    entityCount: number;
    numTrimmedTracks: number;
    totalEntities: number;
};
export type VectorTileLayerMeta = {
    tileLayerId: string;
};
export type DataRequestMeta = {
    requestStopTime?: number;
    warnings?: SearchResponseWarning[];
} & Partial<SourceRequestMeta & VectorSourceRequestMeta & VectorStyleRequestMeta & ESSearchSourceResponseMeta & ESGeoLineSourceResponseMeta & VectorTileLayerMeta>;
type NumericalStyleFieldData = {
    avg: number;
    max: number;
    min: number;
    std_deviation: number;
};
type CategoricalStyleFieldData = {
    buckets: Array<{
        key: string;
        doc_count: number;
    }>;
    sum_other_doc_count: number;
};
export type StyleMetaData = {
    [key: string]: NumericalStyleFieldData | CategoricalStyleFieldData;
};
export type DataRequestDescriptor = {
    dataId: string;
    dataRequestMetaAtStart?: DataRequestMeta | null;
    dataRequestToken?: symbol;
    data?: object;
    dataRequestMeta?: DataRequestMeta;
    error?: Error;
};
export {};
