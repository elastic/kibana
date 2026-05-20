import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
export declare const deleteInferenceEndpoint: (client: ElasticsearchClient, type: InferenceTaskType, id: string, scanUsage?: boolean) => Promise<import("@elastic/elasticsearch/lib/api/types").InferenceDeleteInferenceEndpointResult>;
