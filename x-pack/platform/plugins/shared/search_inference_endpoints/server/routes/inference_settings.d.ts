import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
export declare const defineInferenceSettingsRoutes: ({ logger, router, featureRegistry, getConnectorById, }: {
    logger: Logger;
    router: IRouter;
    featureRegistry: InferenceFeatureRegistry;
    getConnectorById: (id: string, request: KibanaRequest) => Promise<InferenceConnector>;
}) => void;
