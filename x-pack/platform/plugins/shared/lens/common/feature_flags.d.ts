import { type Observable } from 'rxjs';
import type { FeatureFlagsStart as FeatureFlagsStartPublic } from '@kbn/core/public';
import type { FeatureFlagsStart as FeatureFlagsStartServer } from '@kbn/core/server';
type GetFlagTypes<T extends Record<string, LensFeatureFlag>> = {
    [k in keyof T]: T[k]['fallback'];
} & {
    [K in keyof T as `${K & string}$`]: Observable<T[K]['fallback']>;
};
interface FeatureFlagBase {
    /**
     * Unique flag id staring with `lens.` (i.e. `lens.apiFormat`)
     */
    id: string;
}
type BooleanFeatureFlag = FeatureFlagBase & {
    type: 'boolean';
    fallback: boolean;
};
type NumberFeatureFlag = FeatureFlagBase & {
    type: 'number';
    fallback: number;
};
type StringFeatureFlag = FeatureFlagBase & {
    type: 'string';
    fallback: string;
};
export type LensFeatureFlag = BooleanFeatureFlag | NumberFeatureFlag | StringFeatureFlag;
export declare const lensFeatureFlags: {
    /**
     * Enables transforming lens state to/from new API Format over the wire.
     */
    apiFormat: {
        id: string;
        type: "boolean";
        fallback: boolean;
    };
    /**
     * Enables ES|QL mode for form-based datasources, allowing Lens to generate
     * ES|QL queries instead of traditional DSL aggregations.
     */
    enableEsql: {
        id: string;
        type: "boolean";
        fallback: boolean;
    };
    /**
     * Enables the "Convert to ES|QL" button in the Lens inline editing flyout,
     * allowing users to convert form-based visualizations to ES|QL queries.
     */
    enableEsqlConversion: {
        id: string;
        type: "boolean";
        fallback: boolean;
    };
};
export type LensFeatureFlags = GetFlagTypes<typeof lensFeatureFlags>;
export declare function fetchLensFeatureFlags(service: FeatureFlagsStartPublic | FeatureFlagsStartServer): Promise<LensFeatureFlags>;
export declare function getLensFeatureFlagDefaults(): LensFeatureFlags;
export {};
