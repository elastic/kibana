import type { estypes } from '@elastic/elasticsearch';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { GetModelDownloadConfigOptions, ModelDefinitionResponse } from '@kbn/ml-trained-models-utils';
import type { MlFeatures } from '../../../common/constants/app';
import type { MlInferTrainedModelRequest, MlStopTrainedModelDeploymentRequest, UpdateTrainedModelDeploymentRequest, UpdateTrainedModelDeploymentResponse } from '../../lib/ml_client/types';
import type { GetCuratedModelConfigParams } from '../../models/model_management/models_provider';
import type { GetGuards } from '../shared_services';
export interface TrainedModelsProvider {
    trainedModelsProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract): {
        getTrainedModels(params: estypes.MlGetTrainedModelsRequest): Promise<estypes.MlGetTrainedModelsResponse>;
        getTrainedModelsStats(params: estypes.MlGetTrainedModelsStatsRequest): Promise<estypes.MlGetTrainedModelsStatsResponse>;
        startTrainedModelDeployment(params: estypes.MlStartTrainedModelDeploymentRequest): Promise<estypes.MlStartTrainedModelDeploymentResponse>;
        stopTrainedModelDeployment(params: MlStopTrainedModelDeploymentRequest): Promise<estypes.MlStopTrainedModelDeploymentResponse>;
        inferTrainedModel(params: MlInferTrainedModelRequest): Promise<estypes.MlInferTrainedModelResponse>;
        deleteTrainedModel(params: estypes.MlDeleteTrainedModelRequest): Promise<estypes.MlDeleteTrainedModelResponse>;
        updateTrainedModelDeployment(params: UpdateTrainedModelDeploymentRequest): Promise<UpdateTrainedModelDeploymentResponse>;
        putTrainedModel(params: estypes.MlPutTrainedModelRequest): Promise<estypes.MlPutTrainedModelResponse>;
        getELSER(params?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse>;
        getCuratedModelConfig(...params: GetCuratedModelConfigParams): Promise<ModelDefinitionResponse>;
        installElasticModel(modelId: string): Promise<estypes.MlTrainedModelConfig>;
    };
}
export declare function getTrainedModelsProvider(getGuards: GetGuards, cloud: CloudSetup, enabledFeatures: MlFeatures): TrainedModelsProvider;
