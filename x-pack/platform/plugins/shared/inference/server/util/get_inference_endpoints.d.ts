import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
export interface InferenceEndpoint {
    inferenceId: string;
    taskType: InferenceTaskType;
    service: string;
    serviceSettings?: Record<string, unknown>;
    metadata?: EisInferenceEndpointMetadata;
}
/**
 * Retrieves all available inference endpoints, optionally filtered to
 * only `chat_completion` task type endpoints.
 */
export declare const getInferenceEndpoints: ({ esClient, taskType, }: {
    esClient: ElasticsearchClient;
    taskType?: InferenceTaskType;
}) => Promise<InferenceEndpoint[]>;
