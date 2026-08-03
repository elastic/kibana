import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
export declare const fetchInferenceEndpoints: (client: ElasticsearchClient) => Promise<{
    inferenceEndpoints: InferenceAPIConfigResponse[];
}>;
