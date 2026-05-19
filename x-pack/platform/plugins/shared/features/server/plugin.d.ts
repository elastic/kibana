import type { RecursiveReadonly } from '@kbn/utility-types';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { GetKibanaFeaturesParams } from './feature_registry';
import type { ElasticsearchFeatureConfig, ElasticsearchFeature, KibanaFeature, KibanaFeatureConfig } from '../common';
import type { FeaturePrivilegeIterator, SubFeaturePrivilegeIterator } from './feature_privilege_iterator';
/**
 * Describes public Features plugin contract returned at the `setup` stage.
 */
export interface FeaturesPluginSetup {
    registerKibanaFeature(feature: KibanaFeatureConfig): void;
    registerElasticsearchFeature(feature: ElasticsearchFeatureConfig): void;
    /**
     * Calling this function during setup will crash Kibana.
     * Use start contract instead.
     * @deprecated
     * @removeBy 8.8.0
     */
    getKibanaFeatures(): KibanaFeature[];
    /**
     * Calling this function during setup will crash Kibana.
     * Use start contract instead.
     * @deprecated
     * @removeBy 8.8.0
     */
    getElasticsearchFeatures(): ElasticsearchFeature[];
    /**
     * In the future, OSS features should register their own subfeature
     * privileges. This can be done when parts of Reporting are moved to
     * src/plugins. For now, this method exists for `reporting` to tell
     * `features` to include Reporting when registering OSS features.
     */
    enableReportingUiCapabilities(): void;
    /**
     * Utility for iterating through all privileges belonging to a specific feature.
     * {@see FeaturePrivilegeIterator }
     */
    featurePrivilegeIterator: FeaturePrivilegeIterator;
    /**
     * Utility for iterating through all sub-feature privileges belonging to a specific feature.
     * {@see SubFeaturePrivilegeIterator }
     */
    subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
}
export interface FeaturesPluginStart {
    getElasticsearchFeatures(): ElasticsearchFeature[];
    /**
     * Returns all registered Kibana features.
     * @param params Optional parameters to filter features.
     */
    getKibanaFeatures(params?: GetKibanaFeaturesParams): KibanaFeature[];
}
/**
 * Represents Features Plugin instance that will be managed by the Kibana plugin system.
 */
export declare class FeaturesPlugin implements Plugin<RecursiveReadonly<FeaturesPluginSetup>, RecursiveReadonly<FeaturesPluginStart>> {
    private readonly initializerContext;
    private readonly logger;
    private readonly featureRegistry;
    private isReportingEnabled;
    private capabilities?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): RecursiveReadonly<FeaturesPluginSetup>;
    start(core: CoreStart): RecursiveReadonly<FeaturesPluginStart>;
    stop(): void;
    private registerOssFeatures;
    private enableReportingUiCapabilities;
}
