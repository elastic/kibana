import type { KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
/**
 * Resolves the connector ID for a registered inference feature via the Inference Feature Registry.
 *
 * Resolution order (delegated to `getForFeature`):
 *   1. Admin override in the `inference_settings` SO (set via Model Settings page)
 *   2. `recommendedEndpoints` from the feature registration
 *   3. Platform default connector
 *
 * @throws StatusError(503) if the searchInferenceEndpoints plugin is unavailable.
 * @throws StatusError(400) if no connector resolves for the feature.
 */
export declare function resolveConnectorForFeature({ searchInferenceEndpoints, featureId, featureName, request, }: {
    searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
    featureId: string;
    featureName: string;
    request: KibanaRequest;
}): Promise<string>;
/**
 * Resolves the connector for Streams Significant Events **Discovery** — same inference feature
 * id, Model Settings mapping, and recommended-endpoint fallback chain as insights discovery.
 * Memory-related tasks use this so they share the Discovery model configuration.
 */
export declare function resolveConnectorForSignificantEventsDiscovery({ searchInferenceEndpoints, request, }: {
    searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
    request: KibanaRequest;
}): Promise<string>;
