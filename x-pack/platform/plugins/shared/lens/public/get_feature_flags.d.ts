import type { FeatureFlagsStart } from '@kbn/core/public';
import type { LensFeatureFlags } from '../common';
/**
 * Retrieves all Lens features flags
 *
 * Does not support dynamic changes to flag values
 */
export declare function getLensFeatureFlags(): LensFeatureFlags;
export declare function setLensFeatureFlags(service: FeatureFlagsStart): Promise<LensFeatureFlags>;
