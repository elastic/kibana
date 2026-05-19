import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceEndpoint } from './get_inference_endpoints';
/**
 * Retrieves a specific inference endpoint by its ID.
 *
 * @throws if the endpoint is not found
 */
export declare const getInferenceEndpointById: ({ inferenceId, esClient, }: {
    inferenceId: string;
    esClient: ElasticsearchClient;
}) => Promise<InferenceEndpoint>;
