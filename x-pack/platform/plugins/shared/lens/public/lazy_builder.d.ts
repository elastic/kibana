import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensFeatureFlags } from '../common';
/**
 * Retrieves the Lens builder
 */
export declare function getLensBuilder(): LensConfigBuilder | null;
export declare function setLensBuilder(useApiFormat: LensFeatureFlags['apiFormat']): Promise<LensConfigBuilder | null>;
export declare function ensureBuilderIsInitialized(): Promise<void>;
