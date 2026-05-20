import type { estypes } from '@elastic/elasticsearch';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { type TrainedModelConfigResponse } from '@kbn/ml-common-types/trained_models';
import { type MlFeatures } from '../../common/constants/app';
import type { RouteInitialization } from '../types';
export declare function filterForEnabledFeatureModels<T extends TrainedModelConfigResponse | estypes.MlTrainedModelConfig>(models: T[], enabledFeatures: MlFeatures): T[];
export declare function trainedModelsRoutes({ router, routeGuard, getEnabledFeatures }: RouteInitialization, cloud: CloudSetup): void;
