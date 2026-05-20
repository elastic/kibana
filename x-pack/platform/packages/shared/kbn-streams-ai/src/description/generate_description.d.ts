import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
/**
 * Generate a natural-language description
 */
export declare function generateStreamDescription({ stream, start, end, esClient, inferenceClient, signal, logger, systemPrompt, }: {
    stream: Streams.all.Definition;
    start: number;
    end: number;
    esClient: ElasticsearchClient;
    inferenceClient: BoundInferenceClient;
    signal: AbortSignal;
    logger: Logger;
    systemPrompt: string;
}): Promise<{
    description: string;
    tokensUsed?: ChatCompletionTokenCount;
}>;
