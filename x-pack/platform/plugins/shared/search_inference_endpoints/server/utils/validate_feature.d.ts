import type { InferenceFeatureConfig } from '../types';
export declare const FEATURE_ID_PATTERN: RegExp;
/**
 * Validates an {@link InferenceFeatureConfig} before registration.
 *
 * @param feature - The feature configuration to validate.
 * @throws If `featureId` is empty or does not match `^[a-z][a-z0-9_]*$`.
 * @throws If `parentFeatureId` is set and does not match `^[a-z][a-z0-9_]*$`.
 * @throws If `featureName` is empty.
 * @throws If `featureDescription` is empty.
 * @throws If `taskType` is empty.
 * @throws If `maxNumberOfEndpoints` is specified and less than 1.
 * @throws If `recommendedEndpoints` contains any empty or whitespace-only string.
 */
export declare const validateFeature: (feature: InferenceFeatureConfig) => void;
