import type { IRouter, Logger } from '@kbn/core/server';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
export declare const defineInferenceFeaturesRoutes: ({ logger, router, featureRegistry, }: {
    logger: Logger;
    router: IRouter;
    featureRegistry: InferenceFeatureRegistry;
}) => void;
