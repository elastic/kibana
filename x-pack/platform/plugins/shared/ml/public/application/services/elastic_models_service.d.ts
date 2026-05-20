import type { ModelDefinitionResponse, GetModelDownloadConfigOptions } from '@kbn/ml-trained-models-utils';
import { type TrainedModelsApiService } from './ml_api_service/trained_models';
export declare class ElasticModels {
    private readonly trainedModels;
    constructor(trainedModels: TrainedModelsApiService);
    /**
     * Provides an ELSER model name and configuration for download based on the current cluster architecture.
     * The current default version is 2. If running on Cloud it returns the Linux x86_64 optimized version.
     * If any of the ML nodes run a different OS rather than Linux, or the CPU architecture isn't x86_64,
     * a portable version of the model is returned.
     */
    getELSER(options?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse>;
}
