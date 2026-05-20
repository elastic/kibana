import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { type InferenceConnector } from '@kbn/inference-common';
import type { InferenceSettingsAttributes } from '../common/types';
import type { InferenceFeatureRegistry } from './inference_feature_registry';
import type { ResolvedInferenceEndpoints } from './types';
/**
 * Returns the resolved inference endpoints for a feature.
 * Walks the fallback chain (admin SO override → recommendedEndpoints → parent feature)
 * and fetches the matching connectors by ID.
 *
 * @param registry - The feature registry to look up feature configs.
 * @param soClient - A scoped saved objects client.
 * @param getConnectorById - Function that returns a connector by ID.
 * @param featureId - The feature to resolve endpoints for.
 * @param logger - Logger instance for warnings.
 */
export declare const getForFeature: (registry: InferenceFeatureRegistry, soClient: SavedObjectsClientContract, getConnectorById: (id: string) => Promise<InferenceConnector>, featureId: string, logger: Logger) => Promise<ResolvedInferenceEndpoints>;
interface ResolvedEndpointIds {
    ids: string[];
    warnings: string[];
    /** True when an SO entry was found for the feature (even if it had an empty endpoints list). */
    soEntryFound: boolean;
}
/**
 * Pure resolution logic that walks the fallback chain for a feature using
 * pre-fetched data. Exported so the settings route can reuse it without
 * re-reading the saved object.
 *
 * Fallback order:
 * 1. Admin-configured SO override for the feature itself
 * 2. Walk parentFeatureId chain, checking SO overrides at each level
 * 3. First non-empty recommendedEndpoints found in the chain
 * 4. Kibana default chat-completion endpoint
 */
export declare const resolveFeatureEndpointIds: (registry: InferenceFeatureRegistry, soFeaturesMap: Map<string, InferenceSettingsAttributes["features"][number]>, featureId: string, logger: Logger) => ResolvedEndpointIds;
export {};
