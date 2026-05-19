import type { estypes } from '@elastic/elasticsearch';
import { type DocumentCountStats } from '@kbn/aiops-log-rate-analysis';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { Query } from '@kbn/es-query';
import type { RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import type { GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';
export interface DocumentStatsSearchStrategyParams {
    earliest?: number;
    latest?: number;
    intervalMs?: number;
    index: string;
    searchQuery: Query['query'];
    timeFieldName?: string;
    runtimeFieldMap?: estypes.MappingRuntimeFields;
    fieldsToFetch?: string[];
    selectedSignificantItem?: SignificantItem;
    includeSelectedSignificantItem?: boolean;
    selectedGroup?: GroupTableItem | null;
    trackTotalHits?: boolean;
    projectRouting?: string;
}
export declare const getDocumentCountStatsRequest: (params: DocumentStatsSearchStrategyParams, randomSamplerWrapper?: RandomSamplerWrapper, skipAggs?: boolean, changePoints?: boolean) => {
    index: string;
    body: estypes.SearchSearchRequestBody;
};
export declare const processDocumentCountStats: (body: estypes.SearchResponse | undefined, params: DocumentStatsSearchStrategyParams, randomSamplerWrapper?: RandomSamplerWrapper) => DocumentCountStats | undefined;
