import type { ElasticsearchClient } from '@kbn/core/server';
import type { Readable } from 'stream';
export interface InferenceEndpointInvokeOptions {
    body: Record<string, unknown>;
    signal?: AbortSignal;
    timeout?: number;
}
export interface InferenceEndpointExecutor {
    invoke(options: InferenceEndpointInvokeOptions): Promise<Readable>;
}
export declare const createInferenceEndpointExecutor: ({ inferenceId, esClient, }: {
    inferenceId: string;
    esClient: ElasticsearchClient;
}) => InferenceEndpointExecutor;
