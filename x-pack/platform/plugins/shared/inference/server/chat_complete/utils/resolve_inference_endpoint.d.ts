import type { ElasticsearchClient } from '@kbn/core/server';
export interface InferenceEndpointMeta {
    inferenceId: string;
    provider?: string;
    modelId?: string;
    taskType?: string;
}
/**
 * Resolves metadata about an inference endpoint by querying the ES Inference API.
 * This is used to populate tracing spans and telemetry with model information.
 *
 * Throws if the endpoint does not exist.
 */
export declare const resolveInferenceEndpoint: ({ inferenceId, esClient, }: {
    inferenceId: string;
    esClient: ElasticsearchClient;
}) => Promise<InferenceEndpointMeta>;
