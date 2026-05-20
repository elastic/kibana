import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const isMsearchResponseItemWithAggs: (arg: unknown) => arg is estypes.MsearchMultiSearchItem;
export declare const getBaselineOrDeviationFilter: (params: AiopsLogRateAnalysisSchema) => estypes.QueryDslQueryContainer;
export declare const getCategoryRequest: (params: AiopsLogRateAnalysisSchema, fieldName: string, { wrap }: RandomSamplerWrapper) => estypes.SearchRequest;
export interface FetchCategoriesResponse {
    categories: Category[];
}
export declare const fetchCategories: (esClient: ElasticsearchClient, params: AiopsLogRateAnalysisSchema, fieldNames: string[], logger?: Logger, sampleProbability?: number, emitError?: (m: string) => void, abortSignal?: AbortSignal) => Promise<FetchCategoriesResponse[]>;
