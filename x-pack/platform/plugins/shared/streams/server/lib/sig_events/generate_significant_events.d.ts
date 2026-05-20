import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, InferenceClient } from '@kbn/inference-common';
import type { GeneratedSignificantEventQuery, Streams } from '@kbn/streams-schema';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { FeatureClient } from '../streams/feature/feature_client';
import type { QueryClient } from '../streams/assets/query/query_client';
import type { MemoryDiscoveryTools } from './memory_discovery_tools';
interface Params {
    definition: Streams.all.Definition;
    connectorId: string;
    systemPrompt: string;
    maxExistingQueriesForContext?: number;
}
interface Dependencies {
    inferenceClient: InferenceClient;
    featureClient: FeatureClient;
    queryClient: QueryClient;
    logger: Logger;
    signal: AbortSignal;
    esClient: ElasticsearchClient;
    memoryTools?: MemoryDiscoveryTools;
}
export declare function generateSignificantEventDefinitions(params: Params, dependencies: Dependencies): Promise<{
    queries: GeneratedSignificantEventQuery[];
    tokensUsed: ChatCompletionTokenCount;
    toolUsage: SignificantEventsToolUsage;
}>;
export {};
