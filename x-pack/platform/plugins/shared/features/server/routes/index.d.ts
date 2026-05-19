import type { FeaturesPluginRouter } from '../types';
import type { FeatureRegistry } from '../feature_registry';
/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
    router: FeaturesPluginRouter;
    featureRegistry: FeatureRegistry;
}
export declare function defineRoutes({ router, featureRegistry }: RouteDefinitionParams): void;
