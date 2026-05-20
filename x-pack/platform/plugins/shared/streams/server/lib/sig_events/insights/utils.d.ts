import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InsightCore } from '@kbn/streams-schema';
import type { Query } from '../../../../common/queries';
export interface QueryData {
    title: string;
    esql: string;
    currentCount: number;
    sampleEvents: string[];
}
/**
 * Safely extracts insights from an LLM response.
 */
export declare function extractInsightsFromResponse(response: {
    toolCalls?: Array<{
        function: {
            name: string;
            arguments: unknown;
        };
    }>;
}, logger: Logger): InsightCore[];
export declare function collectQueryData({ query, esClient, }: {
    query: Query;
    esClient: ElasticsearchClient;
}): Promise<QueryData | undefined>;
