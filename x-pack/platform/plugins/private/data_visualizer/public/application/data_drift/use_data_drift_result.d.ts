import type { estypes } from '@elastic/elasticsearch';
import type { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchRequest } from '@kbn/search-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Query } from '@kbn/data-plugin/common';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import type { Feature, DataDriftField, TimeRange } from './types';
import { FETCH_STATUS } from './types';
export declare const getDataComparisonType: (kibanaType: string) => DataDriftField["type"];
export declare const useDataSearch: <T>() => (esSearchRequestParams: IKibanaSearchRequest["params"], abortSignal?: AbortSignal) => Promise<estypes.SearchResponse<any, Record<string, estypes.AggregationsAggregate>> | undefined>;
interface ReturnedError {
    error?: string;
    errorBody?: string;
}
/**
 * Help split one big request into multiple requests (with max of 30 fields/request)
 * to avoid too big of a data payload
 * Returns a merged
 * @param fields - list of fields to split
 * @param randomSamplerWrapper - helper from randomSampler to pack and unpack 'sample' path from esResponse.aggregations
 * @param asyncFetchFn - callback function with the divided fields
 */
export declare const fetchInParallelChunks: <ReturnedRespFromFetchFn extends {
    aggregations: Record<string, AggregationsAggregate>;
}>({ fields, randomSamplerWrapper, asyncFetchFn, errorMsg, }: {
    fields: DataDriftField[];
    randomSamplerWrapper: RandomSamplerWrapper;
    asyncFetchFn: (chunkedFields: DataDriftField[]) => Promise<ReturnedRespFromFetchFn>;
    errorMsg?: string;
}) => Promise<ReturnedRespFromFetchFn | ReturnedError>;
export interface InitialSettings {
    index: string;
    comparison: string;
    reference: string;
    timeField: string;
}
export declare const useFetchDataComparisonResult: ({ fields, initialSettings, currentDataView, timeRanges, searchString, searchQueryLanguage, lastRefresh, }?: {
    lastRefresh: number;
    initialSettings?: InitialSettings;
    fields?: DataDriftField[];
    currentDataView?: DataView;
    timeRanges?: {
        reference: TimeRange;
        comparison: TimeRange;
    };
    searchString?: Query["query"];
    searchQueryLanguage?: SearchQueryLanguage;
}) => {
    result: {
        loaded: number;
        progressMessage: string | undefined;
        status: FETCH_STATUS;
        data?: Feature[] | undefined;
        error?: string;
        errorBody?: string;
    };
    cancelRequest: () => void;
};
export {};
