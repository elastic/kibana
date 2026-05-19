import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ResolvedInferenceEndpoints } from '../types';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
export declare const defineInferenceConnectorsRoute: ({ logger, router, featureRegistry, getForFeature, getConnectorList, getConnectorById, }: {
    logger: Logger;
    router: IRouter;
    featureRegistry: InferenceFeatureRegistry;
    getForFeature: (featureId: string, request: KibanaRequest) => Promise<ResolvedInferenceEndpoints>;
    getConnectorList: (request: KibanaRequest) => Promise<InferenceConnector[]>;
    getConnectorById: (id: string, request: KibanaRequest) => Promise<InferenceConnector>;
}) => void;
