import type { ILicense } from '@kbn/licensing-types';
import type { KibanaFeatureConfig, ElasticsearchFeatureConfig } from '../common';
import { KibanaFeature, ElasticsearchFeature } from '../common';
import type { ConfigOverridesType } from './config';
/**
 * Describes parameters used to retrieve all Kibana features (for internal consumers).
 */
export interface GetKibanaFeaturesParamsInternal {
    /**
     * If provided, the license will be used to filter out features that require a license higher than the specified one.
     * */
    license?: ILicense;
    /**
     * If true, features that require a license higher than the one provided in the `license` will be included.
     */
    ignoreLicense?: boolean;
    /**
     * If true, deprecated features will be omitted. For backward compatibility reasons, deprecated features are included
     * in the result by default.
     */
    omitDeprecated?: boolean;
}
/**
 * Describes parameters used to retrieve all Kibana features (for public consumers).
 */
export interface GetKibanaFeaturesParams {
    /**
     * If true, deprecated features will be omitted. For backward compatibility reasons, deprecated features are included
     * in the result by default.
     */
    omitDeprecated: boolean;
}
export declare class FeatureRegistry {
    private locked;
    private kibanaFeatures;
    private esFeatures;
    lockRegistration(): void;
    registerKibanaFeature(feature: KibanaFeatureConfig): void;
    registerElasticsearchFeature(feature: ElasticsearchFeatureConfig): void;
    /**
     * Updates definitions for the registered features using configuration overrides, if any.
     */
    applyOverrides(overrides: ConfigOverridesType): void;
    /**
     * Once all features are registered and the registry is locked, this method should validate the integrity of the registered feature set, including any potential cross-feature dependencies.
     */
    validateFeatures(): void;
    getAllKibanaFeatures({ license, ignoreLicense, omitDeprecated, }?: GetKibanaFeaturesParamsInternal): KibanaFeature[];
    getAllElasticsearchFeatures(): ElasticsearchFeature[];
}
