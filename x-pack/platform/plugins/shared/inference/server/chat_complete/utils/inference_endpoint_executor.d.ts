import type { Readable } from 'stream';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ChatCompleteMetadata } from '@kbn/inference-common';
export interface InferenceEndpointInvokeOptions {
    body: Record<string, unknown>;
    signal?: AbortSignal;
    metadata?: ChatCompleteMetadata;
    timeout?: number;
}
export interface InferenceEndpointExecutor {
    invoke(options: InferenceEndpointInvokeOptions): Promise<Readable>;
}
export declare const createInferenceEndpointExecutor: ({ inferenceId, esClient, }: {
    inferenceId: string;
    esClient: ElasticsearchClient;
}) => InferenceEndpointExecutor;
