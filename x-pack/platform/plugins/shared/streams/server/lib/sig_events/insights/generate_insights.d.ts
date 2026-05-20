import type { BoundInferenceClient, ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { GenerateInsightsResult } from '@kbn/streams-schema';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
export interface InsightsMemoryTools {
    tools: Record<string, ToolDefinition>;
    callbacks: Record<string, ToolCallback>;
    systemPromptSnippet: string;
}
export declare function generateInsights({ streamsClient, queryClient, esClient, inferenceClient, signal, logger, streamNames, memoryTools, }: {
    streamsClient: StreamsClient;
    queryClient: QueryClient;
    esClient: ElasticsearchClient;
    inferenceClient: BoundInferenceClient;
    signal: AbortSignal;
    logger: Logger;
    /** When provided, only generate insights for these streams. Otherwise all streams are used. */
    streamNames?: string[];
    memoryTools?: InsightsMemoryTools;
}): Promise<GenerateInsightsResult>;
