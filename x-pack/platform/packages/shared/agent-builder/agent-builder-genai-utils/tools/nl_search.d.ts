import type { TimeRange } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { EsqlResponse } from './utils/esql';
export interface NaturalLanguageSearchResponse {
    /**
     * The ES|QL query which was generated based on the provided NL query, index and context
     */
    generatedQuery: string;
    /**
     * The ES|QL data which was returned by executing the query.
     */
    esqlData?: EsqlResponse;
    /**
     * Error message if the query could not be executed
     */
    error?: string;
}
export declare const naturalLanguageSearch: ({ nlQuery, target, model, esClient, logger, events, rowLimit, customInstructions, timeRange, }: {
    nlQuery: string;
    target: string;
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
    events: ToolEventEmitter;
    rowLimit?: number;
    customInstructions?: string;
    timeRange?: TimeRange;
}) => Promise<NaturalLanguageSearchResponse>;
