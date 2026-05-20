import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type SignificantItem } from '@kbn/ml-agg-utils';
import { type RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const getSignificantTermRequest: (params: AiopsLogRateAnalysisSchema, fieldNames: string[], { wrap }: RandomSamplerWrapper) => estypes.SearchRequest;
export declare const fetchSignificantTermPValues: ({ esClient, abortSignal, logger, emitError, arguments: args, }: {
    esClient: ElasticsearchClient;
    abortSignal?: AbortSignal;
    logger?: Logger;
    emitError?: (m: string) => void;
    arguments: AiopsLogRateAnalysisSchema & {
        fieldNames: string[];
        sampleProbability?: number;
    };
}) => Promise<SignificantItem[]>;
