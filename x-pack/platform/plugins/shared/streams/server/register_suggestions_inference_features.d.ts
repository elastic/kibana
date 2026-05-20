import type { Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
/**
 * Registers Streams parent + child suggestion features with the Inference Feature Registry.
 * No-op when the searchInferenceEndpoints plugin is unavailable.
 */
export declare function registerSuggestionsInferenceFeatures(searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined, logger: Logger): void;
