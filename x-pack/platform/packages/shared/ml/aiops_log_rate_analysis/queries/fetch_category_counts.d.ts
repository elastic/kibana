import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import type { FetchCategoriesResponse } from './fetch_categories';
export declare const getCategoryCountRequest: (params: AiopsLogRateAnalysisSchema, fieldName: string, categories: Category[], from: number | undefined, to: number | undefined, sampleProbability: number) => estypes.SearchRequest;
export declare const fetchCategoryCounts: (esClient: ElasticsearchClient, params: AiopsLogRateAnalysisSchema, fieldName: string, categories: FetchCategoriesResponse, sampleProbability: number, from: number | undefined, to: number | undefined, logger?: Logger, emitError?: (m: string) => void, abortSignal?: AbortSignal) => Promise<FetchCategoriesResponse>;
