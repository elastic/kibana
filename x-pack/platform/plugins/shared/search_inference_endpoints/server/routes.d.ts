import type { IRouter, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceFeatureRegistry } from './inference_feature_registry';
import type { ResolvedInferenceEndpoints } from './types';
export declare function defineRoutes({ logger, router, featureRegistry, getForFeature, getConnectorList, getConnectorById, }: {
    logger: Logger;
    router: IRouter;
    featureRegistry: InferenceFeatureRegistry;
    getForFeature: (featureId: string, request: KibanaRequest) => Promise<ResolvedInferenceEndpoints>;
    getConnectorList: (request: KibanaRequest) => Promise<InferenceConnector[]>;
    getConnectorById: (id: string, request: KibanaRequest) => Promise<InferenceConnector>;
}): void;
