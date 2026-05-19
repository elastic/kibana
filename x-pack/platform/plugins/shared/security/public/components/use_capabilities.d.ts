import type { Capabilities } from '@kbn/core-capabilities-common';
type FeatureCapabilities = Capabilities[string];
/**
 * Returns capabilities for a specific feature, or alternatively the entire capabilities object.
 * @param featureId ID of feature
 */
export declare function useCapabilities(): Capabilities;
export declare function useCapabilities<T extends FeatureCapabilities = FeatureCapabilities>(featureId: string): T;
export {};
