import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").SearchInferenceEndpointsPlugin>;
export type { SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart, InferenceFeatureConfig, RegisterResult, InferenceFeatureRegistryContract, InferenceFeatureRegistryStartContract, InferenceEndpointsContract, ResolvedInferenceEndpoints, } from './types';
