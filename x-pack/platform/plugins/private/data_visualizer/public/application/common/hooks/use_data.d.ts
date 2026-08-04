import type { DataView } from '@kbn/data-views-plugin/common';
import type { Dictionary } from '@kbn/ml-url-state';
import type { Moment } from 'moment';
import type { RandomSampler } from '@kbn/ml-random-sampler-utils';
import type { Query } from '@kbn/es-query';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { InitialSettings } from '../../data_drift/use_data_drift_result';
export declare const useData: (initialSettings: InitialSettings, selectedDataView: DataView, contextId: string, searchString: Query["query"], searchQueryLanguage: SearchQueryLanguage, randomSampler: RandomSampler, randomSamplerProd: RandomSampler, onUpdate?: (params: Dictionary<unknown>) => void, barTarget?: number, timeRange?: {
    min: Moment;
    max: Moment;
}) => {
    documentStats: import("./use_document_count_stats").DocumentStats;
    documentStatsProd: import("./use_document_count_stats").DocumentStats;
    timefilter: import("@kbn/data-plugin/public").TimefilterContract;
    /** Start timestamp filter */
    earliest: number;
    /** End timestamp filter */
    latest: number;
    intervalMs: number | undefined;
    forceRefresh: () => void;
};
