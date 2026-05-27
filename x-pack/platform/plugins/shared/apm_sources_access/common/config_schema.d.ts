import { type TypeOf } from '@kbn/config-schema';
/**
 * Schema for APM indices
 */
export declare const indicesSchema: import("@kbn/config-schema").ObjectType<{
    transaction: import("@kbn/config-schema").Type<string>;
    span: import("@kbn/config-schema").Type<string>;
    error: import("@kbn/config-schema").Type<string>;
    metric: import("@kbn/config-schema").Type<string>;
    onboarding: import("@kbn/config-schema").Type<string>;
    sourcemap: import("@kbn/config-schema").Type<string>;
}>;
/**
 * Schema for APM Sources configuration
 */
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    indices: import("@kbn/config-schema").ObjectType<{
        transaction: import("@kbn/config-schema").Type<string>;
        span: import("@kbn/config-schema").Type<string>;
        error: import("@kbn/config-schema").Type<string>;
        metric: import("@kbn/config-schema").Type<string>;
        onboarding: import("@kbn/config-schema").Type<string>;
        sourcemap: import("@kbn/config-schema").Type<string>;
    }>;
}>;
/**
 * Schema for APM Sources configuration
 */
export type APMSourcesAccessConfig = TypeOf<typeof configSchema>;
/**
 * Schema for APM indices
 */
export type APMIndices = APMSourcesAccessConfig['indices'];
