import type { estypes } from '@elastic/elasticsearch';
import type { Query } from '@kbn/es-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { AggregatableField, NonAggregatableField } from '../../types/overall_stats';
import type { OverallStatsSearchStrategyParams, SamplingOption } from '../../../../../common/types/field_stats';
export declare const checkAggregatableFieldsExistRequest: (dataViewTitle: string, query: Query["query"], aggregatableFields: OverallStatsSearchStrategyParams["aggregatableFields"], samplingOption: SamplingOption, timeFieldName: string | undefined, earliestMs?: number | string, latestMs?: number | string, datafeedConfig?: estypes.MlDatafeed, runtimeMappings?: estypes.MappingRuntimeFields, projectRouting?: string) => estypes.SearchRequest;
export interface AggregatableFieldOverallStats extends IKibanaSearchResponse {
    aggregatableFields: OverallStatsSearchStrategyParams['aggregatableFields'];
}
export type NonAggregatableFieldOverallStats = IKibanaSearchResponse;
export declare function isAggregatableFieldOverallStats(arg: unknown): arg is AggregatableFieldOverallStats;
export declare function isNonAggregatableFieldOverallStats(arg: unknown): arg is NonAggregatableFieldOverallStats;
export declare function isNonAggregatableSampledDocs(arg: unknown): arg is IKibanaSearchResponse<estypes.SearchResponse<unknown>>;
export declare const processAggregatableFieldsExistResponse: (responses: AggregatableFieldOverallStats[] | undefined, aggregatableFields: OverallStatsSearchStrategyParams["aggregatableFields"], populatedFieldsInIndex: Set<string> | null | undefined, datafeedConfig?: estypes.MlDatafeed) => {
    aggregatableExistsFields: AggregatableField[];
    aggregatableNotExistsFields: AggregatableField[];
};
export declare const checkNonAggregatableFieldExistsRequest: (dataViewTitle: string, query: Query["query"], field: string, timeFieldName: string | undefined, earliestMs: number | string | undefined, latestMs: number | string | undefined, runtimeMappings?: estypes.MappingRuntimeFields, projectRouting?: string) => estypes.SearchRequest;
export declare const isUnsupportedVectorField: (fieldName: string) => boolean;
export declare const getSampleOfDocumentsForNonAggregatableFields: (nonAggregatableFields: string[], dataViewTitle: string, query: Query["query"], timeFieldName: string | undefined, earliestMs: number | string | undefined, latestMs: number | string | undefined, runtimeMappings?: estypes.MappingRuntimeFields, projectRouting?: string) => estypes.SearchRequest;
export declare const processNonAggregatableFieldsExistResponse: (results: IKibanaSearchResponse[] | undefined, nonAggregatableFields: string[], nonAggregatableFieldsCount: number[], nonAggregatableFieldsUniqueCount: Array<Set<string>>, populatedNonAggregatableFields: string[]) => {
    nonAggregatableExistsFields: NonAggregatableField[];
    nonAggregatableNotExistsFields: NonAggregatableField[];
};
