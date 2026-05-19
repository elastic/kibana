import type { PluginInitializer } from '@kbn/core/public';
import type { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';
export type { KibanaFeatureConfig, FeatureKibanaPrivileges, SubFeatureConfig, SubFeaturePrivilegeConfig, } from '../common';
export { KibanaFeature } from '../common';
export type { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';
export declare const plugin: PluginInitializer<FeaturesPluginSetup, FeaturesPluginStart>;
