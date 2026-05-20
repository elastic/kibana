import type { Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
/**
 * Registers Streams Significant Events parent + child features with the Inference Feature Registry.
 * No-op when the searchInferenceEndpoints plugin is unavailable.
 */
export declare function registerSignificantEventsInferenceFeatures(searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined, logger: Logger): void;
