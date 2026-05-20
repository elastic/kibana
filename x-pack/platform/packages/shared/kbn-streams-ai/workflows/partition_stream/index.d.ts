import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Feature, Streams } from '@kbn/streams-schema';
import { type Condition } from '@kbn/streamlang';
export type PartitionSuggestionsReason = 'no_clusters' | 'no_samples' | 'all_data_partitioned';
export type PartitionStreamResponse = {
    partitions: Array<{
        name: string;
        condition: Condition;
    }>;
    reason?: PartitionSuggestionsReason;
};
export declare function partitionStream({ definition, inferenceClient, esClient, logger, start, end, maxSteps, signal, getFeatures, userPrompt, existingPartitions, }: {
    definition: Streams.WiredStream.Definition;
    inferenceClient: BoundInferenceClient;
    esClient: ElasticsearchClient;
    logger: Logger;
    start: number;
    end: number;
    maxSteps?: number | undefined;
    signal: AbortSignal;
    getFeatures(params?: {
        type?: string[];
        minConfidence?: number;
        limit?: number;
    }): Promise<Feature[]>;
    userPrompt?: string;
    existingPartitions?: Array<{
        name: string;
        condition: Condition;
    }>;
}): Promise<PartitionStreamResponse>;
