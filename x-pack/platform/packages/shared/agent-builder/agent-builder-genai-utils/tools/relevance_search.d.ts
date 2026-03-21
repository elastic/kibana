import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { PerformMatchSearchResponse } from './steps';
export type RelevanceSearchResponse = PerformMatchSearchResponse;
export declare const relevanceSearch: ({ term, target, size, model, esClient, logger, }: {
    term: string;
    target: string;
    size?: number;
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<RelevanceSearchResponse>;
