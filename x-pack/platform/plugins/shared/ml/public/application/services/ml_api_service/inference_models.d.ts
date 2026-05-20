import type { estypes } from '@elastic/elasticsearch';
import type { HttpService } from '../http_service';
export declare function inferenceModelsApiProvider(httpService: HttpService): {
    /**
     * Gets all inference endpoints
     */
    getAllInferenceEndpoints(): Promise<estypes.InferenceGetResponse>;
};
