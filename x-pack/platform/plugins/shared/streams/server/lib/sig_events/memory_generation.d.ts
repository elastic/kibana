import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, InferenceClient } from '@kbn/inference-common';
import type { BaseFeature, GeneratedSignificantEventQuery, Insight } from '@kbn/streams-schema';
export interface MemoryGenerationParams {
    insights?: Insight[];
    features?: BaseFeature[];
    queries?: Array<{
        streamName: string;
        query: GeneratedSignificantEventQuery;
    }>;
}
export interface MemoryGenerationResult {
    streamsProcessed: number;
    tokensUsed: ChatCompletionTokenCount;
}
interface MemoryGenerationDependencies {
    inferenceClient: InferenceClient;
    connectorId: string;
    esClient: ElasticsearchClient;
    logger: Logger;
    signal: AbortSignal;
}
export declare function generateMemory(params: MemoryGenerationParams, deps: MemoryGenerationDependencies): Promise<MemoryGenerationResult>;
export {};
