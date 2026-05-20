import type { Logger } from '@kbn/core/server';
import type { InferenceFeatureConfig, RegisterResult } from './types';
/**
 * Registry for inference features. Features can be registered and queried at any time.
 */
export declare class InferenceFeatureRegistry {
    private features;
    private readonly logger;
    constructor(logger: Logger);
    /**
     * Registers a new inference feature in the registry.
     *
     * @param feature - The feature configuration to register.
     * @returns `{ ok: true }` on success, or `{ ok: false, error }` if validation fails or the feature is a duplicate.
     */
    register(feature: InferenceFeatureConfig): RegisterResult;
    /**
     * Returns all registered features.
     *
     * @returns An array of all registered {@link InferenceFeatureConfig} entries.
     */
    getAll(): InferenceFeatureConfig[];
    /**
     * Returns a single feature by its ID, or `undefined` if not found.
     *
     * @param featureId - The ID of the feature to retrieve.
     * @returns The matching {@link InferenceFeatureConfig}, or `undefined`.
     */
    get(featureId: string): InferenceFeatureConfig | undefined;
}
