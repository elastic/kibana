import type { InferenceConnector } from '@kbn/inference-common';
export interface ApiInferenceConnector extends InferenceConnector {
    isRecommended?: boolean;
}
/**
 * Produces the ordered connector list the UI consumes.
 *
 * - When `soEntryFound` is true, `featureEndpoints` are admin-configured SO overrides and
 *   take precedence; they are returned as-is (no recommended flag).
 * - When `soEntryFound` is false and `featureEndpoints` is non-empty, those are recommended
 *   endpoints. They are marked with `isRecommended: true`, listed first, then the remaining
 *   entries from `allConnectors` follow without duplicates.
 * - When `soEntryFound` is false and `featureEndpoints` is empty, the full catalog is
 *   returned with the platform default chat-completion endpoint moved to the front.
 */
export declare const mergeConnectors: (featureEndpoints: InferenceConnector[], allConnectors: InferenceConnector[], soEntryFound: boolean) => ApiInferenceConnector[];
