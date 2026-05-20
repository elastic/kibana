import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type SignificantItem } from '@kbn/ml-agg-utils';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const fetchSignificantCategories: ({ esClient, abortSignal, emitError, logger, arguments: args, }: {
    esClient: ElasticsearchClient;
    abortSignal?: AbortSignal;
    emitError?: (m: string) => void;
    logger?: Logger;
    arguments: AiopsLogRateAnalysisSchema & {
        fieldNames: string[];
        sampleProbability?: number;
    };
}) => Promise<SignificantItem[]>;
